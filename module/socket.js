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
          Hooks.call("chooseDefense", {
            actor, 
            data: {
                reaction: data.reaction,
                critical: data.critical,
                roll: data.roll,
                damageData: data.damageData,
                actor: data.baseactor,
                id: data.id
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
