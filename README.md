This is a fork of https://github.com/OneGraph/graphiql-explorer-example wrapped into 
a standalone docker container.

## Usage

```
docker build . -t graphiql-console
docker run \
    -e APP_TITLE='GraphQL console' \
    -e GRAPHQL_API='http://server/graphql' # GraphQL http endpoint as seen by browser
    -p 8888:80
    graphiql-console
```

Now you can go to `http://localhost:8888` and play with your API.