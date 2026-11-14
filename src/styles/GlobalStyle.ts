import { createGlobalStyle } from 'styled-components';
import { font } from './tokens';

const GlobalStyle = createGlobalStyle`
  html { scrollbar-gutter: stable; scroll-behavior: smooth; }
  body {
    margin: 0;
    font-family: ${font.family};
    word-break: keep-all;
  }
  a { color: inherit; text-decoration: none; }
  button, input, select, textarea { font-family: inherit; }
  button:disabled { cursor: not-allowed; }
  table { font-variant-numeric: tabular-nums; }
`;

export default GlobalStyle;
