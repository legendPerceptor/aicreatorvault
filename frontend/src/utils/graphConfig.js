// Graph configuration for styling and behavior

export const entityTypeConfig = {
  prompt: {
    label: 'Prompt',
    icon: '\u{1F4DD}',
    color: '#3b82f6', // Blue
    bgColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  image: {
    label: 'Image',
    icon: '\u{1F5BC}\u{FE0F}',
    color: '#10b981', // Green
    bgColor: '#d1fae5',
    borderColor: '#059669',
  },
  theme: {
    label: 'Theme',
    icon: '\u{1F3A8}',
    color: '#8b5cf6', // Purple
    bgColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  resource: {
    label: 'Resource',
    icon: '\u{1F4C1}',
    color: '#f97316', // Orange
    bgColor: '#fff7ed',
    borderColor: '#ea580c',
    subTypes: {
      pdf: {
        icon: '\u{1F4D1}',
        label: 'PDF',
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#b91c1c',
      },
      web_link: {
        icon: '\u{1F310}',
        label: 'Web Link',
        color: '#0891b2',
        bgColor: '#ecfeff',
        borderColor: '#0e7490',
      },
      youtube: {
        icon: '\u{25B6}\u{FE0F}',
        label: 'YouTube',
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#b91c1c',
      },
      note: {
        icon: '\u{1F4DD}',
        label: 'Note',
        color: '#d97706',
        bgColor: '#fffbeb',
        borderColor: '#b45309',
      },
      file: {
        icon: '\u{1F4C4}',
        label: 'File',
        color: '#6b7280',
        bgColor: '#f9fafb',
        borderColor: '#4b5563',
      },
    },
  },
};

export const relationshipTypeConfig = {
  generated: {
    label: 'Generated',
    color: '#8b5cf6', // Purple
    animated: true,
    style: 'solid',
  },
  derived_from: {
    label: 'Derived From',
    color: '#f59e0b', // Amber
    animated: false,
    style: 'dashed',
  },
  version_of: {
    label: 'Version Of',
    color: '#10b981', // Green
    animated: false,
    style: 'dotted',
  },
  inspired_by: {
    label: 'Inspired By',
    color: '#ec4899', // Pink
    animated: true,
    style: 'solid',
  },
  contains: {
    label: 'Contains',
    color: '#8b5cf6', // Purple
    animated: false,
    style: 'solid',
  },
};

export const graphLayoutConfig = {
  defaultNodeWidth: 200,
  defaultNodeHeight: 80,
  nodeSpacing: 100,
  levelSpacing: 150,
};

export const graphBehaviorConfig = {
  panOnScroll: true,
  panOnScrollSpeed: 0.5,
  zoomOnScroll: true,
  zoomOnDoubleClick: true,
  panOnDrag: true,
  minZoom: 0.1,
  maxZoom: 2,
  defaultPosition: [0, 0],
  defaultZoom: 1,
};

export const getEntityTypeConfig = (type) => {
  return (
    entityTypeConfig[type] || {
      label: 'Unknown',
      icon: '\u{2753}',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      borderColor: '#4b5563',
    }
  );
};

// Backward compat alias
export const getAssetTypeConfig = getEntityTypeConfig;

export const getRelationshipTypeConfig = (type) => {
  return (
    relationshipTypeConfig[type] || {
      label: 'Related',
      color: '#6b7280',
      animated: false,
      style: 'solid',
    }
  );
};

export const getNodeStyle = (type) => {
  const config = getEntityTypeConfig(type);
  return {
    backgroundColor: config.bgColor,
    border: `2px solid ${config.borderColor}`,
    borderRadius: '8px',
    color: config.color,
    width: `${graphLayoutConfig.defaultNodeWidth}px`,
    height: `${graphLayoutConfig.defaultNodeHeight}px`,
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  };
};

export const getEdgeStyle = (type) => {
  const config = getRelationshipTypeConfig(type);
  return {
    stroke: config.color,
    strokeWidth: 2,
    strokeDasharray: config.style === 'dashed' ? '5,5' : config.style === 'dotted' ? '2,2' : 'none',
    animation: config.animated ? 'dash 1s linear infinite' : 'none',
  };
};

export const filterOptions = {
  entityTypes: [
    { value: 'prompt', label: 'Prompts' },
    { value: 'image', label: 'Images' },
    { value: 'theme', label: 'Themes' },
    { value: 'resource', label: 'Resources' },
  ],
  // Backward compat alias
  get assetTypes() {
    return this.entityTypes;
  },
  relationshipTypes: [
    { value: 'generated', label: 'Generated' },
    { value: 'derived_from', label: 'Derived From' },
    { value: 'version_of', label: 'Version Of' },
    { value: 'inspired_by', label: 'Inspired By' },
    { value: 'contains', label: 'Theme Contains' },
  ],
};
