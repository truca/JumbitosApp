if (Meteor.isClient) {
  // counter starts at 0
  Meteor.subscribe("users");
  
  Template.body.helpers({
    users: function () {
      return Meteor.users.find({});
    },
    isAdmin: function(){
      return currentUser.tipo == "admin"? true : false;
    },
    notLoggedIn: function(){
      return Meteor.userId() ? false : true;
    }
  });

  Template.body.events({
    'submit .editUsers': function (event) {
      var jugadasValue = event.target.jugadas.value;
      var ordenValue = event.target.orden.value;
      var id = event.target.id.value;
      Meteor.users.update(id, {$set: {jugadas: jugadasValue, orden: ordenValue}});
      return false;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish("users", function () {
      return Meteor.users.find({});
    });
    
    Accounts.onCreateUser(function(options, user) {
      user.jumbitos = 0;
      user.jugadas = 0;
      user.ordenLlegada = -1;
      user.tipo = 'normal';
      return user;
    });
  });
}
