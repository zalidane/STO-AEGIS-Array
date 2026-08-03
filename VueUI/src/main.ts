import { createApp } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import { DefaultApolloClient } from "@vue/apollo-composable";

import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";

import App from "./App.vue";
import router from "./router";
import { apolloClient } from "./apollo";

const app = createApp(App);
const vuetify = createVuetify();

app.provide(DefaultApolloClient, apolloClient);
app.use(createPinia());
app.use(router);
app.use(vuetify);

app.mount("#app");
