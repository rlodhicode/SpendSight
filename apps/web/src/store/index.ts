import { applyMiddleware, compose, createStore } from "redux";
import { createLogger } from "redux-logger";
import { thunk } from "redux-thunk";
import { rootReducer } from "./reducers";

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

const logger = createLogger({ collapsed: true, diff: true });
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancer = composeEnhancers(applyMiddleware(thunk, logger));

export const store = createStore(rootReducer, enhancer as never);
