export type ElasticSearchExpression = any

type MatchFieldOptions = {
  query: string | number | boolean
  analyzer?: string
  auto_generate_synonyms_phrase_query?: boolean
  fuzziness?: 'AUTO' | '0' | '1' | '2'
  max_expansions?: number
  prefix_length?: number
  fuzzy_transpositions?: boolean
  fuzzy_rewrite?: string
  lenient?: boolean
  operator?: 'AND' | 'OR'
  minimum_should_match?: string
  zero_terms_query?: 'none' | 'all'
}

type MatchBoolPrefixOptions = {
  query: string | number | boolean
  analyzer?: string
  fuzziness?: 'AUTO' | '0' | '1' | '2'
  prefix_length?: number
  max_expansions?: number
  fuzzy_transpositions?: boolean
  fuzzy_rewrite?: string
}

type MatchPhraseOptions = {
  query: string | number | boolean
  analyzer?: string
  zero_terms_query?: 'none' | 'all'
}

type MatchPhrasePrefixOptions = {
  query: string | number | boolean
  analyzer?: string
  max_expansions?: number
  slop?: number
  zero_terms_query?: 'none' | 'all'
}

type MultiMatchOptions = {
  fields: string[]
  type?: 'best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix', 'bool_prefix',
  analyzer?: string
}

type CombindedFiledsOptions = {
  fields: string[]
  auto_generate_synonyms_phrase_query?: boolean
  operator?: 'OR' | 'AND'
  minimun_should_match?: string
  zero_terms_query?: 'none' | 'all'
}

type QueryStringOptions = {
  default_field?: string
  allow_leading_wildcard?: boolean
  analyze_wildcard?: boolean
  auto_generate_synonyms_phrase_query?: boolean
  boost?: number
  default_operator?: 'OR' | 'AND'
  enable_position_increments?: boolean
  fields?: string[]
  fuzziness?: string
  fuzzy_max_expansions?: number
  fuzzy_prefix_length?: number
  fuzzy_transpositions?: boolean
  lenient?: boolean
  max_determinized_states?: number
  minimum_should_match?: string
  quote_analyzer?: string
  phrase_slop?: number
  quote_field_suffix?: string
  rewrite?: string
  time_zone?: string
}

type SimpleQueryStringOptions = {
  fields?: string[]
  allow_leading_wildcard?: boolean
  analyze_wildcard?: boolean
  analyzer?: string
  auto_generate_synonyms_phrase_query?: boolean
  boost?: number
  default_operator?: 'OR' | 'AND'
  enable_position_increments?: boolean
  fuzziness?: string
  fuzzy_max_expansions?: number
  fuzzy_prefix_length?: number
  fuzzy_transpositions?: boolean
  lenient?: boolean
  max_determinized_states?: number
  minimum_should_match?: string
  quote_analyzer?: string
  phrase_slop?: number
  quote_field_suffix?: string
  flags?: string
  all_fields?: boolean
}

type FuzzyOptions = {
  fuzziness?: 'AUTO' | '0' | '1' | '2'
  max_expansions?: number
  prefix_length?: number
  transpositions?: boolean
  rewrite?: 'constant_score' |
  'constant_score_boolean' |
  'scoring_boolean' |
  'top_terms_blended_freqs_N' |
  'top_terms_boost_N' |
  'top_terms_N'
}

type RangeOptions = {
  gt?: number | string
  gte?: number | string
  lt?: number | string
  lte?: number | string
  format?: string
  relation?: 'INTERSECTS' | 'CONTAINS' | 'WITHIN'
  time_zone?: string
  boost?: number
}

type RegExpOptions = {
  flags?: string
  case_insensitive?: boolean
  max_determinized_states?: number
  rewrite?: 'constant_score' |
  'constant_score_boolean' |
  'scoring_boolean' |
  'top_terms_blended_freqs_N' |
  'top_terms_boost_N' |
  'top_terms_N'
}

// Turns a series of arguments, all valid ESEs, into a Elastic Search JSON Query
// by removing all helper functions and stringifying the object.
const ESQuery = (...expressions: ElasticSearchExpression) => {
  const query = {}
  expressions.forEach((exp) => {
    if (typeof exp[Object.keys(exp)[0]] !== 'function') // Remove all of the helper funcitons
      query[Object.keys(exp)[0]] = exp[Object.keys(exp)[0]]
  })

  return JSON.stringify(query)
}

// Aliast for ESQuery
const BuildQuery = ESQuery
// Alias for ESQuery
const Build = ESQuery
// Alist for ESQuery
const ElasticSearchQuery = ESQuery

// Creates a query object that accepts a valid ESE and places it
// into the query body. It will also optionally accept from and size parameters
// before you build the query, you'll have access to 3 methods.
// replace, which changes the expression inside of the query body, and
// from and size, which just add the from and size parameters
const Query = (expression: ElasticSearchExpression, from?: number, size?: number) => {
  const es = {
    query: {
      expression,
      ...(from) && { from },
      ...(size) && { size },
    },
    replace: (expression: ElasticSearchExpression) => {
      es.query = {
        expression,
        ...(from) && { from },
        ...(size) && { size },
      }
      return es
    },
    from: (quantity: number) => {
      es.query.from = quantity
      return es
    },
    size: (quantity: number) => {
      es.query.size = quantity
      return es
    },
  }

  return es
}

// OrQuery is shorthand for Query(Bool(Should(...expressions)), from?, size?) and will accept
// any number of leaf or compound query clauses. You can also pass along from and size,
// but these must specifically be the last and second to last parameters. You can also
// pass along a function to determine the expressions to be placed in the should array
// you are returned the object and four methods:
// add which pushes a new expression(s) to the should array
// remove which removes an expression from the should array by key, dot notation is accepted
// from which adds from
// size which adds size
const OrQuery = (...expressions: ElasticSearchExpression | number | (() => ElasticSearchExpression[])) => {
  const should = []
  let from,
    size

  expressions.forEach((expression: ElasticSearchExpression, index: number) => {
    if (typeof expression === 'number' && index === expressions.length - 2) from = expression
    else if (typeof expression === 'number' && index === expressions.length - 1) size = expression
    else if (typeof expression === 'function') should.push(...expression())
    else should.push(expression)
  })

  const es = {
    query: {
      bool: {
        should,
      },
      ...(from) && { from },
      ...(size) && { size },
    },
    add: (...expressions: ElasticSearchExpression) => {
      expressions.forEach(expression =>
        typeof expression === 'function'
          ? es.query.bool.should.push(...expression())
          : es.query.bool.should.push(...expressions),
      )

      return es
    },
    remove: (...keys: string[]) => {
      keys.forEach((key: string, index: number) => {
        es.query.bool.should.find(q => key.split('.').forEach(k => q[k]))
      })
    },
    from: (quantity: number) => {
      es.query.from = quantity
      return es
    },
    size: (quantity: number) => {
      es.query.size = quantity
      return es
    },
  }

  return es
}

const NotQuery = (...expressions: ElasticSearchExpression | number) => {
  const ro = {
    query: {
      bool: {
        must_not: [
          ...expressions,
        ],
      },
      ...(from) && { from },
      ...(size) && { size },
    },
    add: (...expressions: ElasticSearchExpression) => ro.query.bool.must_not.push(...expressions),
    remove: (...keys) => ro.query.bool.must_not = ro.query.bool.must_not.filter(field => !keys.includes(Object.keys(field)[0])),
    from: (quantity: number) => ro.query.from = quantity,
    size: (quantity: number) => ro.query.size = quantity,
  }

  return ro
}

const Must = (...expression: ElasticSearchExpression) => {
  const ro = {
    must: [
      ...expression,
    ],
    add: (...expressions: ElasticSearchExpression) => ro.must.push(...expressions),
    remove: (...keys) => ro.must = ro.must.filter(field => !keys.includes(Object.keys(field)[0])),
  }

  return ro
}

const Should = (...expressions: ElasticSearchExpression) => {
  const ro = {
    should: [
      ...expressions,
    ],
    more: (...expressions: ElasticSearchExpression) => {
      ro.should.push(...expressions)
    },
  }

  return ro
}

const MustNot = (...expression: ElasticSearchExpression) => {
  return {
    must_not: [
      ...expression,
    ],
  }
}

const Filter = (...expression: ElasticSearchExpression) => {
  return {
    filter: [
      ...expression,
    ],
  }
}

const AndFilter = () => { }

const OrFilter = () => { }

const NotFilter = () => { }

const Match = (field: string, options: string | MatchFieldOptions) => {
  if (typeof options === 'string') options = { query: options }
  return {
    match: {
      [field]: {
        ...options,
      },
    },
  }
}

const MatchBoolPrefix = (
  field: string,
  options: string | MatchBoolPrefixOptions,
  minimum_should_match: number,
) => {
  if (typeof options === 'string') options = { query: options }
  return {
    match_bool_prefix: {
      [field]: {
        ...options,
      },
      ...(minimum_should_match) && { minimum_should_match },
    },
  }
}

const MatchPhrase = (field: string, options: string | MatchPhraseOptions, slop?: number) => {
  if (typeof options === 'string') options = { query: options }
  return {
    match_phrase: {
      [field]: {
        ...options,
      },
      ...(slop) && { slop },
    },
  }
}

const MatchPhrasePrefix = (field: string, options: string | MatchPhrasePrefixOptions) => {
  if (typeof options === 'string') options = { query: options }
  return {
    match_phrase_prefix: {
      [field]: {
        ...options,
      },
    },
  }
}

const MultiMatch = (query: string, options: MultiMatchOptions) => {
  return {
    multi_match: {
      query,
      ...options,
    },
  }
}

const CombindedFields = (query: string, options: CombindedFiledsOptions) => {
  return {
    combined_fields: {
      query,
      ...options,
    },
  }
}

const QueryString = (query: string, options?: QueryStringOptions) => {
  return {
    query_string: {
      query,
      ...options,
    },
  }
}

const SimpleQueryString = (query: string, options: SimpleQueryStringOptions) => {
  return {
    simple_query_string: {
      query,
      ...options,
    },
  }
}

const Exists = (field: string) => {
  return {
    exists: {
      field,
    },
  }
}

const Fuzzy = (field: string, value: string, options: FuzzyOptions) => {
  return {
    fuzzy: {
      [field]: {
        value,
        ...options,
      },
    },
  }
}

const Ids = (values: string[]) => {
  return {
    ids: {
      values,
    },
  }
}

const Prefix = (field: string, value: string, options?: { rewrite?: string; case_insensitive?: boolean }) => {
  return {
    prefix: {
      [field]: {
        value,
        ...options,
      },
    },
  }
}

const Term = (field: string, value: string, options?: { boost?: number; case_insensitive?: boolean }) => {
  return {
    term: {
      [field]: {
        value,
        ...options,
      },
    },
  }
}

const Terms = (fields: any, options?: { boost?: number }) => {
  return {
    terms: {
      ...fields,
      ...options,
    },
  }
}

const Sort = (...Fields: any) => {
  const ro = {
    sort: [...Fields],
    add: (...Fields) => ro.sort.push(...Fields),
    remove: (...keys: any) => ro.sort = ro.sort.filter(field => !keys.includes(Object.keys(field)[0])),
  }

  return ro
}

const Field = (field: string, options: any) => {
  return {
    [field]: options,
  }
}

const Nested = (path: string, options: any) => {
  return {
    nested: {
      path,
      ...options,
    },
  }
}

const RangeE = (field: string, options?: RangeOptions) => {
  if (field.split(' ').some(c => c === '>' || c === '<' || c === '>=' || c === '<=')) {
    const parts: string[] = field.split(' ')
    field = parts[0]
    parts.forEach((p: string, i: number) => {
      switch (p) {
        case '>':
          options.gt = parts[i + 1]
          break
        case '<':
          options.lt = parts[i + 1]
          break
        case '>=':
          options.gte = parts[i + 1]
          break
        case '<=':
          options.lte = parts[i + 1]
        default:
          break
      }
    })
  }
  return {
    range: {
      [field]: {
        ...options,
      },
    },
  }
}

const RegExpE = (field: string, value: string, options?: RegExpOptions) => {
  return {
    regexp: {
      [field]: {
        value,
        ...options,
      },
    },
  }
}

const Bool = (...expressions: ElasticSearchExpression | { minimum_should_match?: number; boost?: number }) => {
  const bool = {}
  expressions.forEach(exp => bool[Object.keys(exp)[0]] = exp[Object.keys(exp)[0]])
  console.log(expressions)
  return {
    bool,
  }
}

const TermsAgg = (field: string, options) => {

}

const Aggs = () => {

}
