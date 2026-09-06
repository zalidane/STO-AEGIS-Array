import { createApp } from "vue";
import { createPinia } from "pinia";
import { DefaultApolloClient } from "@vue/apollo-composable";

import vuetify from "./plugins/vuetify.ts";
import "@mdi/font/css/materialdesignicons.css";

import App from "./App.vue";
import router from "./router";
import { apolloClient } from "./apollo";

const app = createApp(App);

app.provide(DefaultApolloClient, apolloClient);
app.use(createPinia());
app.use(router);
app.use(vuetify);

app.config.errorHandler = (err) => {
  console.error(err);
  if (router.currentRoute.value.name === "server-error") return;
  void router.replace({ name: "server-error" });
};

app.mount("#app");
