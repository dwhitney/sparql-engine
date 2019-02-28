/* file : rdf-terms.ts
MIT License

Copyright (c) 2018 Thomas Minier

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use strict'

import { parseZone, Moment } from 'moment'
import { rdf } from './utils'

/**
 * An intermediate format to represent RDF Terms
 */
export interface RDFTerm {
  /**
   * Type of the term
   */
  readonly type: string,
  /**
   * Value of the term, in string format
   */
  readonly value: string,
  /**
   * RDF representation of the term
   */
  readonly asRDF: string,
  /**
   * JS representation of the term
   */
  readonly asJS: any
}

/**
 * An intermediate format to represent RDF IRIs
 */
export interface IRI extends RDFTerm {}

/**
 * An intermediate format to represent RDF plain Literals
 */
export interface RawLiteral extends RDFTerm {}

/**
 * An intermediate format to represent RDF Literal with a language tag
 */
export interface LangLiteral extends RDFTerm {
  /**
   * Language tag
   */
  readonly lang: string
}

/**
 * An intermediate format to represent RDF Literal with a datatype
 */
export interface TypedLiteral extends RDFTerm {
  /**
   * Datatype
   */
  readonly datatype: string
}

/**
 * Parse a RDF Literal to its Javascript representation
 * See https://www.w3.org/TR/rdf11-concepts/#section-Datatypes for more details.
 * @param value - Literal value
 * @param type - Literal datatype
 * @return Javascript representation of the literal
 */
function literalToJS (value: string, type: string): any {
  switch (type) {
    case rdf.XSD('integer'):
    case rdf.XSD('byte'):
    case rdf.XSD('short'):
    case rdf.XSD('int'):
    case rdf.XSD('unsignedByte'):
    case rdf.XSD('unsignedShort'):
    case rdf.XSD('unsignedInt'):
    case rdf.XSD('number'):
    case rdf.XSD('float'):
    case rdf.XSD('decimal'):
    case rdf.XSD('double'):
    case rdf.XSD('long'):
    case rdf.XSD('unsignedLong'):
    case rdf.XSD('positiveInteger'):
    case rdf.XSD('nonPositiveInteger'):
    case rdf.XSD('negativeInteger'):
    case rdf.XSD('nonNegativeInteger'):
      return Number(value)
    case rdf.XSD('boolean'):
      return value === '"true"' || value === '"1"'
    case rdf.XSD('dateTime'):
    case rdf.XSD('dateTimeStamp'):
    case rdf.XSD('date'):
    case rdf.XSD('time'):
    case rdf.XSD('duration'):
      return parseZone(value)
    case rdf.XSD('hexBinary'):
      return Buffer.from(value, 'hex')
    case rdf.XSD('base64Binary'):
      return Buffer.from(value, 'base64')
    default:
      return value
  }
}

/**
 * Creates an IRI in {@link RDFTerm} format
 * @param iri - IRI
 * @return A new IRI in {@link RDFTerm} format
 */
export function createIRI (iri: string): IRI {
  return {
    type: 'iri',
    value: iri,
    asRDF: iri,
    asJS: iri
  }
}

/**
 * Creates a Literal in {@link RDFTerm} format
 * @param literal - Literal
 * @return A new Literal in {@link RDFTerm} format
 */
export function createLiteral (literal: string): RawLiteral {
  const rdf = `"${literal}"`
  return {
    type: 'literal',
    value: literal,
    asRDF: rdf,
    asJS: rdf
  }
}

/**
 * Creates a Literal with a datatype, in {@link RDFTerm} format
 * @param literal - Literal
 * @param type - Literal datatype
 * @return A new typed Literal in {@link RDFTerm} format
 */
export function createTypedLiteral (literal: string, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: literal,
    datatype: type,
    asRDF: `"${literal}"^^${type}`,
    asJS: literalToJS(literal, type)
  }
}

/**
 * Creates a Literal with a language tag, in {@link RDFTerm} format
 * @param literal - Literal
 * @param lang - Language tag
 * @return A new tagged Literal in {@link RDFTerm} format
 */
export function createLangLiteral (literal: string, lang: string): LangLiteral {
  const rdf = `"${literal}"@${lang}`
  return {
    type: 'literal+lang',
    value: literal,
    lang,
    asRDF: rdf,
    asJS: rdf
  }
}

/**
 * Creates a Literal from a boolean, in {@link RDFTerm} format
 * @param value - Boolean
 * @return A new typed Literal in {@link RDFTerm} format
 */
export function createBoolean (value: boolean): TypedLiteral {
  return {
    type: 'literal+type',
    value: `"${value}"`,
    datatype: 'http://www.w3.org/2001/XMLSchema#boolean',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#boolean`,
    asJS: value
  }
}

/**
 * Creates a Literal from a number, in {@link RDFTerm} format
 * @param value - Number
 * @param type - Literal type
 * @return A new typed Literal in {@link RDFTerm} format
 */
export function createNumber (value: number, type: string): TypedLiteral {
  return {
    type: 'literal+type',
    value: value.toString(),
    datatype: type,
    asRDF: `"${value}"^^${type}`,
    asJS: value
  }
}

/**
 * Creates a Literal from a Moment date, in {@link RDFTerm} format
 * @param date - A Date, in Moment format
 * @return A new typed Literal in {@link RDFTerm} format
 */
export function createDate (date: Moment): TypedLiteral {
  const value = date.toISOString()
  return {
    type: 'literal+type',
    value: value,
    datatype: 'http://www.w3.org/2001/XMLSchema#dateTime',
    asRDF: `"${value}"^^http://www.w3.org/2001/XMLSchema#dateTime`,
    asJS: date
  }
}

/**
 * Clone a literal and replace its value with another one
 * @param  base     - Literal to clone
 * @param  newValue - New literal value
 * @return The literal with its new value
 */
export function replaceLiteralValue (term: RDFTerm, newValue: string): RDFTerm {
  switch (term.type) {
    case 'literal+type':
      return createTypedLiteral(newValue, (<TypedLiteral> term).datatype)
    case 'literal+lang':
      return createLangLiteral(newValue, (<LangLiteral> term).lang)
    default:
      return createLiteral(newValue)
  }
}

/**
 * Test if Two RDF Terms are equals
 * @see https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
 * @param {Object} a - Left Term
 * @param {Object} b - Right term
 * @return {Object} A RDF Literal with the results of the test
 */
export function equals (a: RDFTerm, b: RDFTerm): RDFTerm {
  if (a.type !== b.type) {
    return createBoolean(false)
  }
  switch (a.type) {
    case 'iri':
    case 'literal':
      return createBoolean(a.value === b.value)
    case 'literal+type':
      return createBoolean(a.value === b.value && (<TypedLiteral> a).datatype === (<TypedLiteral> b).datatype)
    case 'literal+lang':
      return createBoolean(a.value === b.value && (<LangLiteral> a).lang === (<LangLiteral> b).lang)
    default:
      return createBoolean(false)
  }
}

/**
 * Test if a literal is a Date
 * @param  {Object}  literal - Literal to analyze
 * @return {Boolean} True if a literal is a Date, False otherwise
 */
export function isDate (literal: RDFTerm): boolean {
    return literal.type === 'literal+type' && (<TypedLiteral> literal).datatype === rdf.XSD('dateTime')
}
