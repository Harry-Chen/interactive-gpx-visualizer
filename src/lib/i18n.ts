import type { MetricKey } from "../types";
import type { BasemapId } from "./basemaps";

export type Language = "zh" | "en";

const translations = {
  zh: {
    appSubtitle: "Earth Routes",
    appTitle: "GPX / FIT Visualizer",
    upload: "上传 GPX / FIT",
    importing: "正在解析...",
    importingProgress: "正在解析 {done}/{total}",
    noSupportedFiles: "没有找到支持的 .gpx、.fit、.gpx.gz 或 .fit.gz 文件",
    tracks: "轨迹",
    matched: "匹配",
    visibleSet: "当前集合",
    noMatchedTracks: "没有匹配的轨迹",
    hideTrack: "隐藏轨迹",
    showTrack: "显示轨迹",
    colorTrack: "切换颜色",
    focusTrack: "缩放到轨迹",
    removeTrack: "移除轨迹",
    selectedCount: "已选 {count}",
    selectAll: "全选",
    clearSelection: "取消选择",
    showSelected: "显示选中",
    hideSelected: "隐藏选中",
    deleteSelected: "删除选中",
    clearAll: "清空",
    sortBy: "排序",
    sortName: "名称",
    sortDate: "日期",
    sortDistance: "长度",
    sortDuration: "运动时长",
    sortAsc: "升序",
    sortDesc: "降序",
    boxSelect: "框选区域",
    boxSelecting: "拖拽地图框选",
    boxSelectTitle: "框选筛选区域",
    matchedRegion: "{count} 条经过区域",
    clearFilter: "清除筛选",
    noFilter: "未启用区域筛选",
    basemap: "底图",
    theme: "主题",
    themeSystem: "跟随系统",
    themeLight: "浅色",
    themeDark: "深色",
    directionArrows: "方向箭头",
    language: "语言",
    uploadPromptTitle: "上传并选择一条轨迹",
    uploadPromptBody: "轨迹的爬升、时间、速度和 FIT/GPX 扩展数据会在这里展开。",
    distance: "距离",
    duration: "用时",
    elevationGain: "爬升",
    avgSpeed: "均速",
    avgHeartRate: "平均心率",
    avgPower: "平均功率",
    about: "关于",
    aboutTitle: "关于这个应用",
    version: "版本",
    buildDate: "构建时间",
    license: "许可证",
    repository: "代码仓库",
    publicSite: "公开站点",
    dependencies: "主要依赖",
    close: "关闭",
    loadingCharts: "正在加载图表...",
    emptyMetrics: "这条轨迹没有可绘制的指标数据",
    dropTitle: "拖拽导入 GPX / FIT",
    dropBody: "支持文件夹递归导入，会自动忽略其他格式",
    parseInvalidGpx: "不是有效的 GPX 文件",
    parseInvalidFit: "不是有效的 FIT 文件",
    parseNoRoutePoints: "没有找到可绘制的路线点",
    parseNoGpsRecords: "没有找到可绘制的 GPS 记录",
    parseFitFailed: "FIT 解码失败",
    parseUnsupported: "仅支持 .gpx、.fit、.gpx.gz 和 .fit.gz 文件",
    parseGzipUnsupported: "当前浏览器不支持 gzip 解压",
    parseGzipFailed: "gzip 解压失败"
  },
  en: {
    appSubtitle: "Earth Routes",
    appTitle: "GPX / FIT Visualizer",
    upload: "Upload GPX / FIT",
    importing: "Parsing...",
    importingProgress: "Parsing {done}/{total}",
    noSupportedFiles: "No supported .gpx, .fit, .gpx.gz, or .fit.gz files found",
    tracks: "Tracks",
    matched: "Matched",
    visibleSet: "Visible Set",
    noMatchedTracks: "No matching tracks",
    hideTrack: "Hide track",
    showTrack: "Show track",
    colorTrack: "Change color",
    focusTrack: "Zoom to track",
    removeTrack: "Remove track",
    selectedCount: "{count} selected",
    selectAll: "Select all",
    clearSelection: "Clear selection",
    showSelected: "Show selected",
    hideSelected: "Hide selected",
    deleteSelected: "Delete selected",
    clearAll: "Clear all",
    sortBy: "Sort",
    sortName: "Name",
    sortDate: "Date",
    sortDistance: "Distance",
    sortDuration: "Moving time",
    sortAsc: "Ascending",
    sortDesc: "Descending",
    boxSelect: "Select Area",
    boxSelecting: "Drag on map",
    boxSelectTitle: "Draw a filter area",
    matchedRegion: "{count} through area",
    clearFilter: "Clear filter",
    noFilter: "No area filter",
    basemap: "Basemap",
    theme: "Theme",
    themeSystem: "System",
    themeLight: "Light",
    themeDark: "Dark",
    directionArrows: "Direction arrows",
    language: "Language",
    uploadPromptTitle: "Upload and select a track",
    uploadPromptBody: "Elevation, time, speed, and FIT/GPX extension data will appear here.",
    distance: "Distance",
    duration: "Time",
    elevationGain: "Climb",
    avgSpeed: "Avg speed",
    avgHeartRate: "Avg HR",
    avgPower: "Avg power",
    about: "About",
    aboutTitle: "About this app",
    version: "Version",
    buildDate: "Build date",
    license: "License",
    repository: "Repository",
    publicSite: "Public site",
    dependencies: "Key dependencies",
    close: "Close",
    loadingCharts: "Loading charts...",
    emptyMetrics: "This track has no plottable metric data",
    dropTitle: "Drop GPX / FIT files",
    dropBody: "Folders are imported recursively and unsupported files are ignored",
    parseInvalidGpx: "Not a valid GPX file",
    parseInvalidFit: "Not a valid FIT file",
    parseNoRoutePoints: "No drawable route points found",
    parseNoGpsRecords: "No drawable GPS records found",
    parseFitFailed: "FIT decode failed",
    parseUnsupported: "Only .gpx, .fit, .gpx.gz, and .fit.gz files are supported",
    parseGzipUnsupported: "This browser does not support gzip decompression",
    parseGzipFailed: "gzip decompression failed"
  }
} as const;

const basemapNames: Record<Language, Record<BasemapId, string>> = {
  zh: {
    osm: "OSM 标准",
    osmHot: "OSM 人道主义",
    topo: "OpenTopoMap 地形",
    satellite: "卫星图"
  },
  en: {
    osm: "OSM Standard",
    osmHot: "OSM Humanitarian",
    topo: "OpenTopoMap",
    satellite: "Satellite"
  }
};

export const metricLabelsByLanguage: Record<Language, Record<MetricKey, { label: string; unit: string; color: string }>> = {
  zh: {
    ele: { label: "海拔", unit: "m", color: "#2c7a7b" },
    speed: { label: "速度", unit: "km/h", color: "#c2410c" },
    heartRate: { label: "心率", unit: "bpm", color: "#be123c" },
    cadence: { label: "踏频", unit: "rpm", color: "#7c3aed" },
    power: { label: "功率", unit: "W", color: "#b45309" },
    temperature: { label: "温度", unit: "C", color: "#0f766e" }
  },
  en: {
    ele: { label: "Elevation", unit: "m", color: "#2c7a7b" },
    speed: { label: "Speed", unit: "km/h", color: "#c2410c" },
    heartRate: { label: "Heart rate", unit: "bpm", color: "#be123c" },
    cadence: { label: "Cadence", unit: "rpm", color: "#7c3aed" },
    power: { label: "Power", unit: "W", color: "#b45309" },
    temperature: { label: "Temperature", unit: "C", color: "#0f766e" }
  }
};

export type TranslationKey = keyof (typeof translations)["zh"];

export function t(language: Language, key: TranslationKey, values: Record<string, string | number> = {}) {
  let text: string = translations[language][key];
  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, String(value));
  }

  return text;
}

export function basemapName(language: Language, id: BasemapId) {
  return basemapNames[language][id];
}
