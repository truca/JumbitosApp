if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish("users", function () {
      return Meteor.users.find();
    });
    
    Accounts.onCreateUser(function(options, user) {
      user.jumbitos = 0;
      user.atrasado = false;
      user.ausente = false;
      user.jugadas = 0;
      user.ordenLlegada = -1;
      user.tipo = 'normal';
      return user;
    });
  });
}


if(Meteor.isClient) {
  Meteor.subscribe("users");
  
  Template.body.helpers({
    users: function () {
      return Meteor.users.find({});
    },
    notAdmin: function(){
      return Meteor.user().tipo == "admin"? false : true;
    },
    notLoggedIn: function(){
      return Meteor.userId() ? false : true;
    },
    isCreating: function(){
      return Session.get("creating_match")? true : false;
    }
  });
  
  Template.showTable.helpers({
    isUserEmail: function(email){
      return email == Meteor.user().emails[0].address? true : false;
    },
    currentUserCanPlay: function(){
      return Meteor.user().puedeJugar? true : false;
    }
  });

  Template.body.events({
    'submit .editUsers': function (event) {
      var jugadasValue = event.target.jugadas.value;
      var ordenValue = event.target.orden.value;
      var id = event.target.id.value;
      //Dispatcher.dispatch({actionType: ""});
      Meteor.users.update(id, {$set: {jugadas: jugadasValue, orden: ordenValue}});
      return false;
    },
    'click .buttonCreate': function(event){
      Session.set("creating_match", true);
    },
    'click .buttonEnd': function(event){
      Session.set("creating_match", false);
      Dispatcher.dispatch({actionType: "USER_ALLOW_TO_PLAY"});
    },
    'change .atrasado':function(event){
      var mail = $(event.target).parent().parent().children(".email").text();
      Dispatcher.dispatch({actionType: "USER_SET_LATE", checked: event.target.checked, email: mail});
    },
    'change .ausente':function(event){
      var mail = $(event.target).parent().parent().children(".email").text();
      Dispatcher.dispatch({actionType: "USER_SET_ABSENT", checked: event.target.checked, email: mail});
    },
    'change .orden':function(event){
      var mail = $(event.target).parent().parent().children(".email").text();
      Dispatcher.dispatch({actionType: "USER_SET_ARRIVE_ORDER", order: event.target.value, email: mail});
    },
    'click .buttonStealOne':function(event){
      var mail = $(event.target).parent().parent().children(".email").text();
      Dispatcher.dispatch({actionType: "USER_STEAL_ONE", email: mail});
    },
    'click .buttonEarnTwo':function(event){
      Dispatcher.dispatch({actionType: "USER_EARN_TWO"});
    },
    'click .buttonReset': function(event){
      Dispatcher.dispatch({actionType: "RESET_JUMBITOS"});
    }
  });
}


Dispatcher.register(function(payload){
  switch(payload.actionType) {
    case "USER_CREATE":
      UserStore.create(payload.email, payload.password, payload.passwordConfirmation);
      break;
    case "USER_SET_LATE": // :D
      UserStore.setLate(payload.email, payload.checked);
      break;
    case "USER_SET_ABSENT": // :D
      UserStore.setAbsent(payload.email, payload.checked);
      break;
    case "USER_STEAL_TO": // :D
      UserStore.steal(payload.id, payload.victim_id);
      break;
    case "USER_WIN_TWO": // :D
      UserStore.earnTwo(payload.id);
      break;
    case "USER_RESET_ALL":
      UserStore.update(payload.id);
      break;
    case "USER_SET_ARRIVE_ORDER": // :D
      UserStore.arrive(payload.email, payload.order);
      break;
    case "USER_ALLOW_TO_PLAY":
      UserStore.allowToPlay();
      break;
    case "USER_STEAL_ONE":
      UserStore.stealOne(payload.email);
      break;
    case "USER_EARN_TWO":
      UserStore.earnTwo();
      break;
    case "RESET_JUMBITOS":
      UserStore.resetJumbitos();
      break;
    default:
  }
});

var UserStore = {
  allowToPlay: function(){
    Meteor.call("allowToPlay",{});
  },
  setLate: function(email, checked){
    var user = Meteor.users.findOne({ emails: { $elemMatch: { address: email } } });
    Meteor.call("setLate", {id: user._id, checked: checked});
  },
  setAbsent: function(email, checked){
    var user = Meteor.users.findOne({ emails: { $elemMatch: { address: email } } });
    Meteor.call("setAbsent", {id: user._id, checked: checked});
  },
  arrive: function(email, order){
    var user = Meteor.users.findOne({ emails: { $elemMatch: { address: email } } });
    Meteor.call("setOrder", {id: user._id, order: order});
  },
  stealOne: function(victim_email){
    Meteor.call("stealOne", {thiefId: Meteor.userId(),victimEmail: victim_email});
  },
  earnTwo: function(){
    //hasta aca SI llega
    console.log(Meteor.userId());
    Meteor.call("earnTwo", {id: Meteor.userId()});
  },
  resetJumbitos: function(){
    Meteor.call("resetJumbitos");
  }
};

Meteor.methods({
  setLate: function(data){
    if(data.checked)
      Meteor.users.update(data.id, {$set: {atrasado: data.checked, ordenLlegada: -1}});
    else
      Meteor.users.update(data.id, {$set: {atrasado: data.checked}});  
  },
  setAbsent: function(data){
    if(data.checked)
      Meteor.users.update(data.id, {$set: {ausente: data.checked, ordenLlegada: -1}});
    else
      Meteor.users.update(data.id, {$set: {ausente: data.checked}});  
  },
  setOrder: function(data){
    var user = Meteor.users.find(data.id);
    if(!user.atrasado && !user.ausente)
      Meteor.users.update(data.id, {$set: {ordenLlegada: data.order}});  
  },
  allowToPlay: function(data){
    //Allow
    Meteor.users.update({"atrasado": false, "ausente": false}, {$set: {puedeJugar: true}}, {multi:true});
    
    //DontAllow
    Meteor.users.update({"atrasado": true, "ausente": false}, {$set: {puedeJugar: false}}, {multi:true});
    Meteor.users.update({"atrasado": true, "ausente": true}, {$set: {puedeJugar: false}}, {multi:true});
    Meteor.users.update({"atrasado": false, "ausente": true}, {$set: {puedeJugar: false}}, {multi:true});
  },
  stealOne: function(data){
    var victima = Meteor.users.findOne({ emails: {$elemMatch: {address: data.victimEmail}} });
    if(victima.jumbitos > 0){
      Meteor.users.update(victima._id, {$inc: {jumbitos: - 1}});
      Meteor.users.update(data.thiefId, {$inc: {jumbitos: 1}});  
    }
    Meteor.users.update(data.thiefId, {$set: {puedeJugar: false}});
  },
  earnTwo: function(data){
    Meteor.users.update(data.id, {$set: {puedeJugar: false}, $inc: {jumbitos: 2}}, {multi:true});
  },
  resetJumbitos: function(){
    Meteor.users.update({}, {$set: {jumbitos: 0}}, {multi:true});
  }
});