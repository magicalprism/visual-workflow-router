import React from 'react';
import GraphRenderer from '../components/Graph/GraphRenderer';
import MinimalUI from '../components/MinimalUI';

const Page = () => {
  return (
    <div>
      <h1>Workflow Graph</h1>
      <MinimalUI />
      <GraphRenderer />
    </div>
  );
};

export default Page;