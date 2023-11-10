export class SocketController {
    
  static init() {
    /** Damage */
    game.socket.on("system.dx3rd", ({id, sender, receiver, data}) => {
      if (game.user.id != receiver)
        return;
      
      switch (id) {
        case "applyDamage":
          var actor = game.actors.get(data.actorId);
          Hooks.call("applyDamage", {
            actor, 
            data: {
                data: data.data,
                realDamage: data.realDamage
            }
          });

          break;

        case "chooseDefense":
          var actor = game.actors.get(data.actorId);
          Hooks.call("chooseDamage", {
            actor, 
            data: {
                reaction: data.reaction
            }
          });

          break;
              
        case "enterScene":
          let a = game.actors.get(data.actorId);
          Hooks.call("enterScene", a);

          break;
          
      }
        
    });

  }
    
}
