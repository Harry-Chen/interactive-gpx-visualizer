import { Filter, LocateFixed, SquareDashedMousePointer, X } from "lucide-react";
import type { Bounds } from "../types";
import { BASEMAPS, type BasemapId } from "../lib/basemaps";
import type { Language } from "../lib/i18n";
import { basemapName, t } from "../lib/i18n";

type SelectionToolbarProps = {
  selectionMode: boolean;
  filterBounds: Bounds | null;
  matchedCount: number;
  basemapId: BasemapId;
  showDirectionArrows: boolean;
  language: Language;
  onToggleSelectionMode: () => void;
  onClearFilter: () => void;
  onBasemapChange: (basemapId: BasemapId) => void;
  onDirectionArrowsChange: (enabled: boolean) => void;
  onLanguageChange: (language: Language) => void;
};

export default function SelectionToolbar({
  selectionMode,
  filterBounds,
  matchedCount,
  basemapId,
  showDirectionArrows,
  language,
  onToggleSelectionMode,
  onClearFilter,
  onBasemapChange,
  onDirectionArrowsChange,
  onLanguageChange
}: SelectionToolbarProps) {
  return (
    <div className="selection-toolbar">
      <label className="toolbar-field">
        <span>{t(language, "basemap")}</span>
        <select value={basemapId} onChange={(event) => onBasemapChange(event.target.value as BasemapId)}>
          {BASEMAPS.map((basemap) => (
            <option key={basemap.id} value={basemap.id}>
              {basemapName(language, basemap.id)}
            </option>
          ))}
        </select>
      </label>

      <label className="toolbar-toggle">
        <input
          type="checkbox"
          checked={showDirectionArrows}
          onChange={(event) => onDirectionArrowsChange(event.target.checked)}
        />
        <span>{t(language, "directionArrows")}</span>
      </label>

      <button
        type="button"
        className={selectionMode ? "active" : ""}
        title={t(language, "boxSelectTitle")}
        onClick={onToggleSelectionMode}
      >
        <SquareDashedMousePointer size={18} />
        <span>{selectionMode ? t(language, "boxSelecting") : t(language, "boxSelect")}</span>
      </button>

      {filterBounds ? (
        <div className="filter-chip">
          <Filter size={16} />
          <span>{t(language, "matchedRegion", { count: matchedCount })}</span>
          <button type="button" title={t(language, "clearFilter")} onClick={onClearFilter}>
            <X size={15} />
          </button>
        </div>
      ) : (
        <div className="filter-chip muted">
          <LocateFixed size={16} />
          <span>{t(language, "noFilter")}</span>
        </div>
      )}

      <label className="toolbar-field compact-field">
        <span>{t(language, "language")}</span>
        <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
          <option value="zh">中文 / Chinese</option>
          <option value="en">English / 英语</option>
        </select>
      </label>
    </div>
  );
}
