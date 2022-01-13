/* tslint:disable */
/* eslint-disable */
/**
* Encodes the application data into a base64 url hash.
* @param {number} direction
* @param {(string)[]} stripes
* @returns {string}
*/
export function encode(direction: number, stripes: (string)[]): string;
/**
*/
export function logging_setup(): void;
/**
* Decodes the base64 url hash into the application data.
* @param {string} input
* @returns {any[]}
*/
export function decode(input: string): any[];
