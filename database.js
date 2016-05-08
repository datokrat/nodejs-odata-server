var metadata = require('./metadata');
var exports = module.exports = {};

var Database = exports.Database = (function() {
	function Database() {
		this.data = {
			"Posts": {
				values: [
					{ Id: 1, ContentId: 1 },
					{ Id: 2, ContentId: 1 },
				]
			},
			"PostReferences": {
				values: [
					{ Id: 1, ReferrerId: 1 }
				]
			},
			"Content": {
				values: [
					{ Id: 1, Culture: "de-DE" }
				]
			},
		};
		
		this.schema = {
		  entityTypes: {
		    Post: {
		      properties: {
		        Id: { autoIncrement_nextValue: 3, type: "Edm.Int64" },
		        ContentId: { type: "Edm.Int64" }
		      }
		    }
		  },
		  entitySets: {
		    Posts: {
		      type: "Post"
		    }
		  }
		};
	}
	
	Database.prototype.getSingleEntity = function(entitySetName, id) {
		var entitySet = this.data[entitySetName];
		if(entitySet) {
			var entities = entitySet.values.filter(function(e) { return e.Id == id });
			if(entities.length == 1) {
				return new Result({ entity: entities[0] });
			}
			else if(entities.length == 0) return new Result(null, Errors.ENTITY_NOTFOUND);
			else return new Result(null, Errors.ENTITY_NOT_UNIQUE);
		}
		else return new Result(null, Errors.TABLE_NOTFOUND);
	}
	
	Database.prototype.getReferringEntities = function(entitySetName, propertyName, id) {
		var entitySet = this.data[entitySetName];
		if(entitySet) {
			var entities = entitySet.values.filter(function(e) { return e[propertyName] == id });
			return new Result({ entities: entities });
		}
		else return new Result(null, Errors.TABLE_NOTFOUND);
	}
	
	Database.prototype.getOneToOneNavigationProperty = function(entitySetName, id, propertyName, metadata) {
		var entityResult = this.getSingleEntity(entitySetName, id);
		if(!entityResult.error) {
			var propertyResult = this.getSingleEntity(metadata.EntitySet, entityResult.result.entity[metadata.IdProperty]);
			if(!propertyResult.error) return propertyResult;
			else return new Result(null, Errors.INTERNAL);
		}
		else return new Result(null, entityResult.error);
	}
	
	Database.prototype.getOneToManyNavigationProperty = function(entitySetName, id, propertyName, metadata) {
		//TODO: TABLE_NOTFOUND
		var entityResult = this.getSingleEntity(entitySetName, id);
		if(!entityResult.error) {
			var propertyResult = this.getReferringEntities(metadata.EntitySet, metadata.ReverseProperty, entityResult.result.entity.Id);
			if(!propertyResult.error) return propertyResult;
			else return new Result(null, Errors.INTERNAL);
		}
		else return new Result(null, entityResult.error);
	}
	
	Database.prototype.getEntities = function(entitySetName, filter) {
		var entitySet = this.data[entitySetName];
		var entitySetSchema = this.schema.entitySets[entitySetName];
		if(entitySet) {
			return new Result(this.filterEntities(this.schema.entityTypes[entitySetSchema.type], entitySet.values, filter));
		}
		else return new Result(null, Errors.TABLE_NOTFOUND);
	}
	
	return Database;
})();

Database.prototype.filterEntities = function(schema, entities, filter) {
  var self = this;
  return entities.filter(function(e) { return self.evalFilter(schema, e, filter).value });
}

Database.prototype.evalFilter = function(schema, entity, filter) {
  var self = this;
  switch(filter && filter.type) {
    case null:
    case undefined:
      return { type: "Edm.Boolean", value: true };
    case 'operator':
      var lhs = self.evalFilter(schema, entity, filter.lhs);
      var rhs = self.evalFilter(schema, entity, filter.rhs);
      switch(filter.op) {
        //TODO: type checking + excluding of complex objects
        case 'andExpr':
          return { type: "Edm.Boolean", value: lhs.value && rhs.value };
        case 'orExpr':
          return { type: "Edm.Boolean", value: lhs.value || rhs.value };
        case 'eqExpr':
          return { type: "Edm.Boolean", value: lhs.value === rhs.value };
        case 'neExpr':
          return { type: "Edm.Boolean", value: lhs.value !== rhs.value };
        case 'ltExpr':
          return { type: "Edm.Boolean", value: lhs.value < rhs.value };
        case 'leExpr':
          return { type: "Edm.Boolean", value: lhs.value <= rhs.value };
        case 'gtExpr':
          return { type: "Edm.Boolean", value: lhs.value > rhs.value };
        case 'geExpr':
          return { type: "Edm.Boolean", value: lhs.value >= rhs.value };
        default: throw new Error('not implemented');
      }
    case 'member-expression':
      return self.evalFirstMemberExpr(schema, entity, filter)
    case 'booleanValue':
      return { type: "Edm.Boolean", value: filter.value };
    case 'decimalValue':
      return { type: "Edm.Int64", value: filter.value };
    case 'string':
    default:
      throw new Error('not implemented: ' + filter);
  }
}

Database.prototype.evalFirstMemberExpr = function(schema, entity, expr) {
  var self = this;
  //TODO: lambda expressions
  if(expr.variable != null && expr.variable != '$it') throw new Error('unrecognized in-scope variable');
  var variable = entity;
  var variableSchema = schema;
  return self.evalRelativeMemberExpr(variableSchema, variable, expr.path);
}

Database.prototype.evalRelativeMemberExpr = function(schema, entity, expr) {
  var self = this;
  var property = expr.property;
  if(expr.collectionNavigation || expr.complexPath || expr.primitivePath || expr.complexColPath)
    throw new Error('unsupported member expression');
  
  //TODO: security and error handling below
  if(expr.singleNavigation)
    return self.evalRelativeMemberExpr(this.schema.entityTypes[schema.properties[property].type], entity[property], expr.singleNavigation)
  else
    return { type: schema.properties[property].type, value: entity[property] };
}

var Result = exports.Result = (function() {
	function Result(result, error) {
		this.result = result;
		this.error = error;
	}
	return Result;
})();

var Errors = exports.Errors = {
	NONE: 0,
	INTERNAL: 1,
	TABLE_NOTFOUND: 2,
	ENTITY_NOTFOUND: 3,
	ENTITY_NOT_UNIQUE: 4,
	NOT_IMPLEMENTED: 5,
};