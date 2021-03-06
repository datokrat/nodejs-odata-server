function DbQueryFactory(entitySetName, dbSchema) {
  this.entitySetName = entitySetName;
  this.path = [];
  this.dbSchema = dbSchema;
  this.currentSchema = dbSchema.entitySets[entitySetName];
  this.currentIsCollection = true;
}

DbQueryFactory.prototype.filter = function(filterOption) {
  this.filterOption = filterOption;
}

DbQueryFactory.prototype.expand = function(expandOption) {
  var expandTree = this.expandTree = {};
  (expandOption || []).forEach(function(e) {
    var currentBranch = expandTree;
    e.path.forEach(function(prop) {
      currentBranch = currentBranch[prop] = currentBranch[prop] || {};
    });
  })
}

DbQueryFactory.prototype.selectById = function(id) {
  if(!this.currentIsCollection) throw new Error('current query part should be a collection');
  this.path.push({ type: 'by-id', id: id, resultQuantity: 'one' });
  this.currentIsCollection = false;
  this.currentSchema = this.dbSchema.entityTypes[this.currentSchema.type];
}

DbQueryFactory.prototype.selectProperty = function(property) {
  if(this.currentIsCollection) throw new Error('current query part should be no collection');
  if(this.currentSchema.properties[property] == null) throw new Error('property does not exist: ' + property);
  var propertySchema = this.currentSchema.properties[property];
  this.currentIsCollection = propertySchema.quantity == 'one-to-many' || propertySchema.quantity == 'many-to-many';
  this.path.push({ type: 'property', name: property, resultQuantity: 'many' });
  if(this.currentIsCollection)
    this.currentSchema = this.collectionSchema(propertySchema.type);
  else
    this.currentSchema = this.singleSchema(propertySchema.type);
}

DbQueryFactory.prototype.collectionSchema = function(type) {
  return { type: type };
}

DbQueryFactory.prototype.singleSchema = function(type) {
  return this.dbSchema.entityTypes[type];
}

module.exports = { DbQueryFactory: DbQueryFactory };