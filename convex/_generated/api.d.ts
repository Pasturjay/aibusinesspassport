/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as passports from "../passports";
import type * as users from "../users";
import type * as advisors from "../advisors";
import type * as brain from "../brain";
import type * as documents from "../documents";
import type * as compliance from "../compliance";
import type * as seedComplianceRules from "../seedComplianceRules";
import type * as requests from "../requests";
import type * as admin from "../admin";
import type * as connections from "../connections";
import type * as subscriptions from "../subscriptions";
import type * as notifications from "../notifications";
import type * as documentsStudio from "../documentsStudio";
import type * as tenders from "../tenders";
import type * as assistant from "../assistant";
import type * as marketplace from "../marketplace";

/**
 * A utility for referencing Convex functions in your app's API.
 */
declare const fullApi: ApiFromModules<{
  passports: typeof passports;
  users: typeof users;
  advisors: typeof advisors;
  brain: typeof brain;
  documents: typeof documents;
  compliance: typeof compliance;
  seedComplianceRules: typeof seedComplianceRules;
  requests: typeof requests;
  admin: typeof admin;
  connections: typeof connections;
  subscriptions: typeof subscriptions;
  notifications: typeof notifications;
  documentsStudio: typeof documentsStudio;
  tenders: typeof tenders;
  assistant: typeof assistant;
  marketplace: typeof marketplace;
}>;

export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
