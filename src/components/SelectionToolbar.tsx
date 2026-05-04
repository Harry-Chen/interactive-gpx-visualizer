import { Filter, LocateFixed, SquareDashedMousePointer, X } from "lucide-react";
import type { Bounds } from "../types";

type SelectionToolbarProps = {
  selectionMode: boolean;
  filterBounds: Bounds | null;
  matchedCount: number;
  onToggleSelectionMode: () => void;
  onClearFilter: () => void;
};

export default function SelectionToolbar({
  selectionMode,
  filterBounds,
  matchedCount,
  onToggleSelectionMode,
  onClearFilter
}: SelectionToolbarProps) {
  return (
    <div className="selection-toolbar">
      <button
        type="button"
        className={selectionMode ? "active" : ""}
        title="框选筛选区域"
        onClick={onToggleSelectionMode}
      >
        <SquareDashedMousePointer size={18} />
        <span>{selectionMode ? "拖拽地图框选" : "框选区域"}</span>
      </button>

      {filterBounds ? (
        <div className="filter-chip">
          <Filter size={16} />
          <span>{matchedCount} 条经过区域</span>
          <button type="button" title="清除筛选" onClick={onClearFilter}>
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="filter-chip muted">
          <LocateFixed size={16} />
          <span>未启用区域筛选</span>
        </div>
      )}
    </div>
  );
}
