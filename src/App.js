// @flow

import React, { Component } from "react";
import GraphiQL from "graphiql";
import GraphiQLExplorer from "graphiql-explorer";
import { buildClientSchema, getIntrospectionQuery, parse } from "graphql";
import { makeDefaultArg, getDefaultScalarArgValue } from "./CustomArgs";

import "graphiql/graphiql.css";
import "./App.css";

import type { GraphQLSchema } from "graphql";
import {createGraphiQLFetcher} from "@graphiql/toolkit";
import {createClient} from "graphql-ws";

const GRAPHQL_API = window.GRAPHQL_API || "";
const DEFAULT_QUERY = window.GRAPHQL_DEFAULT_QUERY || "";


const client = createClient({
  webSocketImpl: WebSocket,
  url: () => {
    let url = new URL(GRAPHQL_API, window.location.href)
    if (url.protocol === 'https:') {
      url.protocol = 'wss:'
    } else {
      url.protocol = 'ws:'
    }
    return url.toString()
  }
});


const fetcher = createGraphiQLFetcher({ url: GRAPHQL_API, wsClient: client });


type State = {
  schema: ?GraphQLSchema,
  query: string,
  explorerIsOpen: boolean
};


async function extractResponseFromFetcher(asyncIterable) {
  let result;

  // This request returns async iterable with only one item
  for await (const item of asyncIterable) {
    result = item;
  }

  return result;
}


class App extends Component<{}, State> {
  _graphiql: GraphiQL;
  state = { schema: null, query: DEFAULT_QUERY, explorerIsOpen: true };

  componentDidMount() {
    const response = extractResponseFromFetcher(fetcher({
      query: getIntrospectionQuery()
    }));

    response.then(result => {
      const editor = this._graphiql.getQueryEditor();
      editor.setOption("extraKeys", {
        ...(editor.options.extraKeys || {}),
        "Shift-Alt-LeftClick": this._handleInspectOperation
      });

      this.setState({ schema: buildClientSchema(result.data) });
    });
  }

  _handleInspectOperation = (
    cm: any,
    mousePos: { line: Number, ch: Number }
  ) => {
    const parsedQuery = parse(this.state.query || "");

    if (!parsedQuery) {
      console.error("Couldn't parse query document");
      return null;
    }

    var token = cm.getTokenAt(mousePos);
    var start = { line: mousePos.line, ch: token.start };
    var end = { line: mousePos.line, ch: token.end };
    var relevantMousePos = {
      start: cm.indexFromPos(start),
      end: cm.indexFromPos(end)
    };

    var position = relevantMousePos;

    var def = parsedQuery.definitions.find(definition => {
      if (!definition.loc) {
        console.log("Missing location information for definition");
        return false;
      }

      const { start, end } = definition.loc;
      return start <= position.start && end >= position.end;
    });

    if (!def) {
      console.error(
        "Unable to find definition corresponding to mouse position"
      );
      return null;
    }

    var operationKind =
      def.kind === "OperationDefinition"
        ? def.operation
        : def.kind === "FragmentDefinition"
        ? "fragment"
        : "unknown";

    var operationName =
      def.kind === "OperationDefinition" && !!def.name
        ? def.name.value
        : def.kind === "FragmentDefinition" && !!def.name
        ? def.name.value
        : "unknown";

    var selector = `.graphiql-explorer-root #${operationKind}-${operationName}`;

    var el = document.querySelector(selector);
    el && el.scrollIntoView();
  };

  _handleEditQuery = (query: string): void => this.setState({ query });

  _handleToggleExplorer = () => {
    this.setState({ explorerIsOpen: !this.state.explorerIsOpen });
  };

  render() {
    const { query, schema } = this.state;
    return (
      <div className="graphiql-container">
        <GraphiQLExplorer
          schema={schema}
          query={query}
          onEdit={this._handleEditQuery}
          onRunOperation={operationName =>
            this._graphiql.handleRunQuery(operationName)
          }
          explorerIsOpen={this.state.explorerIsOpen}
          onToggleExplorer={this._handleToggleExplorer}
          getDefaultScalarArgValue={getDefaultScalarArgValue}
          makeDefaultArg={makeDefaultArg}
        />
        <GraphiQL
          ref={ref => (this._graphiql = ref)}
          fetcher={fetcher}
          schema={schema}
          query={query}
          onEditQuery={this._handleEditQuery}
        >
          <GraphiQL.Toolbar>
            <GraphiQL.Button
              onClick={() => this._graphiql.handlePrettifyQuery()}
              label="Prettify"
              title="Prettify Query (Shift-Ctrl-P)"
            />
            <GraphiQL.Button
              onClick={this._handleToggleExplorer}
              label="Explorer"
              title="Toggle Explorer"
            />
          </GraphiQL.Toolbar>
        </GraphiQL>
      </div>
    );
  }
}


export default App;
