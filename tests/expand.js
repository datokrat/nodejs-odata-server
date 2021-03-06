var dbModule = require('../database');

module.exports = { name: "expand", tests: [
  {name: 'expand-entities', run: function(tools) {
    var db = new dbModule.Database();
    var res = db.getSingleEntity('Posts', 1);
    if(!res.result) throw new Error('huh?');
    var entities = [ res.result.entity ];
    
    var expanded = db.expandAndCloneEntities(db.schema.entityTypes.Post, entities, { Children: {} });
    
    tools.assertTrue(function() { return expanded[0].Children }, JSON.stringify(expanded));
    tools.assertTrue(function() { return expanded[0] != entities[0] }, JSON.stringify(expanded));
  } },
  { name: 'clone-entity', run: function (tools) {
    var entity = { Id: 1, NullEntity: null };
    var cloned = dbModule.cloneJsonEntity(entity);
    tools.assertTrue(JSON.stringify(cloned) === '{"Id":1,"NullEntity":null}', JSON.stringify(cloned));
    tools.assertTrue(cloned !== entity, JSON.stringify(cloned));
  } },
  { name: 'clone-null', run: function (tools) {
    var entity = null;
    var cloned = dbModule.cloneJsonEntity(entity);
    tools.assertTrue(cloned == null, JSON.stringify(cloned));
  } },
] }