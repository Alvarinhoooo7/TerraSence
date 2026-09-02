module.exports = {
  apps: [
    {
      name: 'soymomo-cs',
      script: './build/src/index.js',
      watch: true,
      ignore_watch: ['node_modules'],
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
