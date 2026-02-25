// Controller handle HTTP related eg. routing, request validation
import { Elysia } from "elysia";
import { t } from "elysia";

import { Station } from "./service";
import { StationModel } from "./model";

export const station = new Elysia().group("station", (app) =>
  app.get(
    "/search/:keyword",
    ({ params: { keyword } }) => Station.search(keyword),
    {
      response: {
        200: t.Array(StationModel.station),
      },
    },
  ),
);
