// Graph configuration for styling and behavior

export const assetTypeConfig = {
  prompt: {
    label: 'Prompt',
    icon: '📝',
    color: '#3b82f6', // Blue
    bgColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  image: {
    label: 'Image',
    icon: '🖼️',
    color: '#10b981', // Green
    bgColor: '#d1fae5',
    borderColor: '#059669',
  },
  derived_image: {
    label: 'Derived',
    icon: '🔧',
    color: '#f59e0b', // Amber
    bgColor: '#fef3c7',
    borderColor: '#d97706',
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
};

export const graphLayoutConfig = {
  defaultNodeWidth: 180,
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

export const getAssetTypeConfig = (type) => {
  return (
    assetTypeConfig[type] || {
      label: 'Unknown',
      icon: '❓',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      borderColor: '#4b5563',
    }
  );
};

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
  const config = getAssetTypeConfig(type);
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
  assetTypes: [
    { value: 'prompt', label: 'Prompts' },
    { value: 'image', label: 'Images' },
    { value: 'derived_image', label: 'Derived Images' },
  ],
  relationshipTypes: [
    { value: 'generated', label: 'Generated' },
    { value: 'derived_from', label: 'Derived From' },
    { value: 'version_of', label: 'Version Of' },
    { value: 'inspired_by', label: 'Inspired By' },
  ],
};
