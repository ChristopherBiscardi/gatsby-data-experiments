const crypto = require("crypto");
const fs = require("fs");
exports.sourceNodes = ({ actions, schema }) => {
  const { createTypes } = actions;

  createTypes(`interface BlogPost @nodeInterface {
      id: ID!
      title: String
      body: String!
      parent: Node
  }`);

  createTypes(`type ContentYaml implements Node & BlogPost {
      id: ID!
      title: String @proxy(from: "subject")
      body: String!
      parent: Node
  }`);

  createTypes(
    schema.buildObjectType({
      name: `MdxBlogPost`,
      fields: {
        id: { type: `ID!` },
        title: {
          type: "String!"
        },
        parent: {
          type: "Node"
        },
        // excerpt: {
        //   type: "String!",
        //   resolve: async (source, args, context, info) => {
        //     const type = info.schema.getType(`Mdx`);
        //     const mdxNode = context.nodeModel.getNodeById({
        //       id: source.parent
        //     });
        //     const resolver = type.getFields()["excerpt"].resolve;
        //     const excerpt = await resolver(
        //       mdxNode,
        //       { pruneLength: 140 },
        //       context,
        //       {
        //         fieldName: "excerpt"
        //       }
        //     );
        //     return excerpt;
        //   }
        // },
        body: {
          type: "String!",
          resolve(source, args, context, info) {
            const type = info.schema.getType(`Mdx`);
            const mdxNode = context.nodeModel.getNodeById({
              id: source.parent
            });
            const resolver = type.getFields()["body"].resolve;
            return resolver(mdxNode, {}, context, {
              fieldName: "body"
            });
          }
        }
      },
      interfaces: [`Node`, `BlogPost`]
    })
  );
};

exports.onCreateNode = ({ node, actions, getNode, createNodeId }) => {
  const { createNodeField, createNode, createParentChildLink } = actions;

  if (node.internal.type === `ContentYaml`) {
    const parent = getNode(node.parent);

    if (node.subject || node.body) {
      const fieldData = `---
title: ${node.subject.toString()}
---

${node.body}`;

      createNode({
        rawYamlContentMdx: fieldData,
        // Required fields.
        id: createNodeId(`${node.id} >>> ContentYamlForMdx`),
        parent: node.id,
        children: [],
        internal: {
          type: `ContentYamlForMdx`,
          mediaType: `text/markdown`,
          contentDigest: crypto
            .createHash(`md5`)
            .update(fieldData)
            .digest(`hex`),
          content: fieldData,
          description: `Node that allows plugins that operate on Markdown to do their thing`
        }
      });
      createParentChildLink({ parent: parent, child: node });
    } else {
      throw new Error("ContentYaml needs another field");
    }
  }

  if (node.internal.type === `Mdx`) {
    const { frontmatter } = node;
    const parent = getNode(node.parent);

    if (parent.sourceInstanceName === "posts") {
      const fieldData = {
        title: node.frontmatter.title
      };

      createNode({
        ...fieldData,
        // Required fields.
        id: createNodeId(`${node.id} >>> MdxBlogPost`),
        parent: node.id,
        children: [],
        internal: {
          type: `MdxBlogPost`,
          contentDigest: crypto
            .createHash(`md5`)
            .update(JSON.stringify(fieldData))
            .digest(`hex`),
          content: JSON.stringify(fieldData),
          description: `Satisfies the BlogPost interface for Mdx`
        }
      });
      createParentChildLink({ parent: parent, child: node });
    }
  }
};
