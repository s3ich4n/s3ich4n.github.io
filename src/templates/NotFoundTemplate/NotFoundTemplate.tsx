import React from "react";

import { Layout } from "@/components/Layout";
import { Meta } from "@/components/Meta";
import { Page } from "@/components/Page";
import { Sidebar } from "@/components/Sidebar";
import { useSiteMetadata } from "@/hooks";

const NotFoundTemplate: React.FC = () => (
  <Layout>
    <Sidebar />
    <Page title="NOT FOUND">
      <p>
        Looks you like to search page that doesn't exist... Please go to main
        page.
      </p>
      <p>
        <a href="https://blog.s3ich4n.me/">Back to home</a>
      </p>
    </Page>
  </Layout>
);

export const Head: React.FC = () => {
  const { title, subtitle } = useSiteMetadata();
  const pageTitle = `Not Found - ${title}`;

  return <Meta title={pageTitle} description={subtitle} />;
};

export default NotFoundTemplate;
