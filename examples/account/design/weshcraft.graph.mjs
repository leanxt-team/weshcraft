// @ts-nocheck
/* eslint-disable */
// WeshCraft product graph for Account. Generated: do not edit; regenerated with the specs.
// Never imported, never run. It lets code graphs (codegraph) see the product: functions → screens,
// components → operations → entities, and the code tagged `@weshcraft <ref>` that implements each one.
//   codegraph explore "how does <function> work" · codegraph impact <symbol> · codegraph callers <symbol>

/**
 * How «Account» works: its functions, in journey order.
 * Spec: specs/FUNCTIONS.md
 */
export function weshcraftProduct() {
  fnSignUp();
}

/**
 * Function «Sign up»
 * Who: people (app)
 * Data: Subscription (reads), User (reads, writes)
 * Spec: specs/FUNCTIONS.md#fn-sign-up
 * Tag the code that implements it: @weshcraft fn-sign-up
 */
export function fnSignUp() {
  screenSignUp();
  screenProfile();
}

/**
 * Screen «Sign up»
 * Function: Sign up (fnSignUp)
 * Spec: specs/front/screens/scr-sign-up.md
 * Tag the code that implements it: @weshcraft scr-sign-up
 */
export function screenSignUp() {
  opPostUsers();
}

/**
 * Screen «Profile»
 * Function: Sign up (fnSignUp)
 * Spec: specs/front/screens/scr-profile.md
 * Tag the code that implements it: @weshcraft scr-profile
 */
export function screenProfile() {
  opGetUsersMe();
  opPatchUsersMe();
  entitySubscription();
}

/**
 * Operation «POST /users»
 * Spec: specs/back/api.md#op-create-account-10
 * Tag the code that implements it: @weshcraft POST /users
 */
export function opPostUsers() {
  entityUser();
}

/**
 * Operation «GET /users/me»
 * Spec: specs/back/api.md#op-get-users-me-3
 * Tag the code that implements it: @weshcraft GET /users/me
 */
export function opGetUsersMe() {
  entityUser();
}

/**
 * Operation «PATCH /users/me»
 * Spec: specs/back/api.md#op-patch-users-me-15
 * Tag the code that implements it: @weshcraft PATCH /users/me
 */
export function opPatchUsersMe() {
  entityUser();
}

/**
 * Entity «Subscription»
 * Spec: specs/back/domain.md#entity-subscription
 * Tag the code that implements it: @weshcraft Subscription
 */
export function entitySubscription() {}

/**
 * Entity «User»
 * Spec: specs/back/domain.md#entity-user
 * Tag the code that implements it: @weshcraft User
 */
export function entityUser() {}
