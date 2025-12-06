/**
 * App - Root Application Component
 */

import React from 'react';
import { EditorPage } from '@ui/pages';
import './styles/main.css';

export const App: React.FC = () => {
  return (
    <div className="app">
      <EditorPage />
    </div>
  );
};

export default App;
