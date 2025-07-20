module.exports = function override(config, env) {
  // Find the source-map-loader rule
  const sourceMapLoaderRule = config.module.rules.find(rule => {
    return rule.use && rule.use.some(use => 
      use.loader && use.loader.includes('source-map-loader')
    );
  });

  if (sourceMapLoaderRule) {
    // Exclude semanticscholarjs from source-map-loader
    sourceMapLoaderRule.exclude = [
      /node_modules\/semanticscholarjs/,
      ...(sourceMapLoaderRule.exclude || [])
    ];
  }

  return config;
};