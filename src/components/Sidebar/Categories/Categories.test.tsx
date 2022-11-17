import React from "react";

import { Categories } from "@/components/Sidebar/Categories";
import * as mocks from "@/mocks";
import { testUtils } from "@/utils";

/* FIXME */
describe("Categories", () => {
  test("renders correctly", () => {
    const props = {
      categories: mocks.siteMetadata.site.siteMetadata.copyright,
    };
    const tree = testUtils
      .createSnapshotsRenderer(<Categories {...props} />)
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
