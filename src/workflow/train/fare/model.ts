import { t } from "elysia";

export namespace fareModel {
  export const fareResp = t.Object({
    price: t.Number(),
    origin: t.String(),
    destination: t.String(),
  });
  export type fareResp = typeof fareResp.Type;
  export const fareBody = t.Object({
    origin: t.String(),
    dest: t.String(),
  });
  export type fareBody = typeof fareBody.Type;
}
