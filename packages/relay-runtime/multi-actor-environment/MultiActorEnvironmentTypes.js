/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import type {ActorIdentifier} from './ActorIdentifier';
import type {
  Disposable,
  GraphQLResponse,
  INetwork,
  Observable as RelayObservable,
  OperationAvailability,
  OperationDescriptor,
  OperationTracker as RelayOperationTracker,
  OptimisticResponseConfig,
  OptimisticUpdateFunction,
  PayloadData,
  SelectorStoreUpdater,
  SingularReaderSelector,
  Snapshot,
  Store,
  StoreUpdater,
  IEnvironment,
  ExecuteMutationConfig,
} from 'relay-runtime';

/**
 * Interface of actor specific sub-environment
 */
export interface IActorEnvironment extends IEnvironment {
  /**
   * Reference to the main MultiActorEnvironment that handles
   * the network execution/and responsible for network integration
   */
  +multiActorEnvironment: IMultiActorEnvironment;

  /**
   * Identifier of the actor for the current active environment
   */
  +actorIdentifier: ActorIdentifier;
}

/**
 * Interface for the main (or parent) multi-actor environment that contains
 * the map of individual actor-specific sub-environments. These sub-environments
 * implement the Relay IEnvironment interface.
 */
export interface IMultiActorEnvironment {
  /**
   * A factory of actor-specific environments.
   */
  forActor(actorIdentifier: ActorIdentifier): IActorEnvironment;

  /**
   * Determine if the operation can be resolved with data in the store (i.e. no
   * fields are missing).
   *
   * Note that this operation effectively "executes" the selector against the
   * cache and therefore takes time proportional to the size/complexity of the
   * selector.
   */
  check(
    actorIdentifier: ActorIdentifier,
    operation: OperationDescriptor,
  ): OperationAvailability;

  /**
   * Subscribe to changes to the results of a selector. The callback is called
   * when data has been committed to the store that would cause the results of
   * the snapshot's selector to change.
   */
  subscribe(
    actorIdentifier: ActorIdentifier,
    snapshot: Snapshot,
    callback: (snapshot: Snapshot) => void,
  ): Disposable;

  /**
   * Ensure that all the records necessary to fulfill the given selector are
   * retained in-memory. The records will not be eligible for garbage collection
   * until the returned reference is disposed.
   */
  retain(
    actorIdentifier: ActorIdentifier,
    operation: OperationDescriptor,
  ): Disposable;

  /**
   * Apply an optimistic update to the environment. The mutation can be reverted
   * by calling `dispose()` on the returned value.
   */
  applyUpdate(
    actorIdentifier: ActorIdentifier,
    optimisticUpdate: OptimisticUpdateFunction,
  ): Disposable;

  /**
   * Apply an optimistic mutation response and/or updater. The mutation can be
   * reverted by calling `dispose()` on the returned value.
   */
  applyMutation(
    actorIdentifier: ActorIdentifier,
    optimisticConfig: OptimisticResponseConfig,
  ): Disposable;

  /**
   * Commit an updater to the environment. This mutation cannot be reverted and
   * should therefore not be used for optimistic updates. This is mainly
   * intended for updating fields from client schema extensions.
   */
  commitUpdate(actorIdentifier: ActorIdentifier, updater: StoreUpdater): void;

  /**
   * Commit a payload to the environment using the given operation selector.
   */
  commitPayload(
    actorIdentifier: ActorIdentifier,
    operationDescriptor: OperationDescriptor,
    payload: PayloadData,
  ): void;

  /**
   * Get the environment's internal Network.
   */
  getNetwork(actorIdentifier: ActorIdentifier): INetwork;

  /**
   * Get the environment's internal Store.
   */
  getStore(actorIdentifier: ActorIdentifier): Store;

  /**
   * Returns the environment specific OperationTracker.
   */
  getOperationTracker(actorIdentifier: ActorIdentifier): RelayOperationTracker;

  /**
   * Read the results of a selector from in-memory records in the store.
   */
  lookup(
    actorIdentifier: ActorIdentifier,
    selector: SingularReaderSelector,
  ): Snapshot;

  /**
   * Send a query to the server with Observer semantics: one or more
   * responses may be returned (via `next`) over time followed by either
   * the request completing (`completed`) or an error (`error`).
   *
   * Networks/servers that support subscriptions may choose to hold the
   * subscription open indefinitely such that `complete` is not called.
   *
   * Note: Observables are lazy, so calling this method will do nothing until
   * the result is subscribed to: environment.execute({...}).subscribe({...}).
   */
  execute(
    actorIdentifier: ActorIdentifier,
    config: {
      operation: OperationDescriptor,
      updater?: ?SelectorStoreUpdater,
    },
  ): RelayObservable<GraphQLResponse>;

  /**
   * Returns an Observable of GraphQLResponse resulting from executing the
   * provided Mutation operation, the result of which is then normalized and
   * committed to the publish queue along with an optional optimistic response
   * or updater.
   *
   * Note: Observables are lazy, so calling this method will do nothing until
   * the result is subscribed to:
   * environment.executeMutation({...}).subscribe({...}).
   */
  executeMutation(
    actorIdentifier: ActorIdentifier,
    config: ExecuteMutationConfig,
  ): RelayObservable<GraphQLResponse>;

  /**
   * Returns an Observable of GraphQLResponse resulting from executing the
   * provided Query or Subscription operation responses, the result of which is
   * then normalized and committed to the publish queue.
   *
   * Note: Observables are lazy, so calling this method will do nothing until
   * the result is subscribed to:
   * environment.executeWithSource({...}).subscribe({...}).
   */
  executeWithSource(
    actorIdentifier: ActorIdentifier,
    {
      operation: OperationDescriptor,
      source: RelayObservable<GraphQLResponse>,
    },
  ): RelayObservable<GraphQLResponse>;

  /**
   * Returns true if a request is currently "active", meaning it's currently
   * actively receiving payloads or downloading modules, and has not received
   * a final payload yet. Note that a request might still be pending (or "in flight")
   * without actively receiving payload, for example a live query or an
   * active GraphQL subscription
   */
  isRequestActive(
    actorIdentifier: ActorIdentifier,
    requestIdentifier: string,
  ): boolean;
}