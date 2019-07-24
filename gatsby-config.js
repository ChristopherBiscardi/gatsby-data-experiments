module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        name: "posts",
        path: `${__dirname}/src/content/`
      }
    },
    `gatsby-plugin-mdx`,
    `gatsby-transformer-yaml`
  ]
};
