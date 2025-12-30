export const mrContentSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
  required: ["title", "description"],
  additionalProperties: false,
};

export const inlineReviewSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      filePath: { type: "string" },
      line: { type: "integer" },
      oldLine: { type: "integer" },
      severity: { type: "string" },
      comment: { type: "string" },
    },
    required: ["filePath", "severity", "comment"],
    additionalProperties: false,
  },
};
