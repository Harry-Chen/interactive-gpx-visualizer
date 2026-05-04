const SUPPORTED_EXTENSIONS = new Set(["gpx", "fit"]);

type DroppedFileSystemEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type DroppedFileSystemFileEntry = DroppedFileSystemEntry & {
  file: (success: (file: File) => void, error?: (error: DOMException) => void) => void;
};

type DroppedFileSystemDirectoryEntry = DroppedFileSystemEntry & {
  createReader: () => {
    readEntries: (success: (entries: DroppedFileSystemEntry[]) => void, error?: (error: DOMException) => void) => void;
  };
};

type EntryDataTransferItem = DataTransferItem & {
  webkitGetAsEntry?: () => DroppedFileSystemEntry | null;
};

export async function filesFromDataTransfer(dataTransfer: DataTransfer) {
  const itemFiles = await filesFromItems(Array.from(dataTransfer.items) as EntryDataTransferItem[]);
  const files = itemFiles.length ? itemFiles : Array.from(dataTransfer.files);

  return files.filter(isSupportedFile);
}

export function isSupportedFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? SUPPORTED_EXTENSIONS.has(extension) : false;
}

async function filesFromItems(items: EntryDataTransferItem[]) {
  const entries: DroppedFileSystemEntry[] = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      entries.push(entry);
    }
  }
  if (!entries.length) {
    return [];
  }

  const nested = await Promise.all(entries.map(readEntry));
  return nested.flat();
}

async function readEntry(entry: DroppedFileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const file = await readFileEntry(entry as DroppedFileSystemFileEntry);
    return file ? [file] : [];
  }

  if (entry.isDirectory) {
    const entries = await readDirectoryEntries(entry as DroppedFileSystemDirectoryEntry);
    const nested = await Promise.all(entries.map(readEntry));
    return nested.flat();
  }

  return [];
}

function readFileEntry(entry: DroppedFileSystemFileEntry) {
  return new Promise<File | null>((resolve) => {
    entry.file(resolve, () => resolve(null));
  });
}

function readDirectoryEntries(entry: DroppedFileSystemDirectoryEntry) {
  const reader = entry.createReader();
  const entries: DroppedFileSystemEntry[] = [];

  return new Promise<DroppedFileSystemEntry[]>((resolve) => {
    const readBatch = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(entries);
          return;
        }

        entries.push(...batch);
        readBatch();
      }, () => resolve(entries));
    };

    readBatch();
  });
}
