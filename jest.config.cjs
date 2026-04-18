process.env.BOOKMARKS_FILE = "./bookmarks.test.json";

module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          moduleResolution: "node16",
        },
        diagnostics: { ignoreCodes: [5107] },
      },
    ],
  },
};
