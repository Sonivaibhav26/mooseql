import {GraphQLNonNull} from 'graphql'
import pluralize from 'pluralize'

/**
 * Filter arguments when doing CRUD
 * @params
 *  - defaultArgs {Object} the result of buildArgs
 *  - opt {Object {filter: {Bool}} options: id, plural, required, idRequired, onlyId
 */
export function filterArgs (defaultArgs, opt) {
  opt = opt || {}
  const packValueToNonNull = (value) => (Object.assign({}, value, {type: new GraphQLNonNull(value.type)}))
  return Object.entries(defaultArgs)
    .filter(([arg, value]) => {
      if (opt.onlyId && arg !== 'id' && arg !== 'ids') return false
      if (opt.id && (arg === 'id' || arg === 'ids')) return false
      if (opt.plural && !value.onlyPlural && pluralize.plural(arg) === arg) return false
      return true
    })
    .map(([arg, value]) => {
      let newValue = Object.assign({}, value)
      if ((arg === 'id' || arg === 'ids') && opt.idRequired) newValue = packValueToNonNull(newValue)
      if (!opt.required && newValue.required && !newValue.context) newValue = packValueToNonNull(newValue)
      return [arg, newValue]
    })
    .reduce((args, [arg, value]) => {
      return Object.assign(args, {[arg]: value})
    }, {})
}

/**
 * Convert args that graphql know to the args that mongoose know
 * so that the args can be used by mongoose to find or create
 */
export function toMongooseArgs (args) {
  // Covert name_first to name: {first}
  let keyDepth = []
  return Object.entries(args).reduce((args, [key, value]) => {
    keyDepth = key.split('_')
    if (keyDepth.length === 1) return Object.assign(args, {[key]: value})
    keyDepth.reduce((args, depth, index) => {
      if (index === keyDepth.length - 1) {
        args[depth] = value
        return
      }
      args[depth] = args[depth] || {}
      return args[depth]
    }, args)
    return args
  }, {})
}

/**
 * Giving an object and a string, pick out wanted data
 * e.g. user { id: 'test' } and user.id => 'test'
 */
export function pickoutValue (target, str) {
  const strDepth = str.split('.')
  const newTarget = target[strDepth[0]]
  if (newTarget === undefined) throw new Error('Cannot find the value')
  if (strDepth.length === 1) return newTarget
  return pickoutValue(newTarget, strDepth.splice(1).join('.'))
}
