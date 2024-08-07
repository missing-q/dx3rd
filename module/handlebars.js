export class DX3rdRegisterHelpers {
  static init() {
    Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('eq', function(arg1, arg2) {
      return (arg1 == arg2)
    });

    Handlebars.registerHelper('isServant', function (item) {
      return item.document.type == "servant";
    });

    Handlebars.registerHelper('isWeapon', function (item) {
      return item == "weapon";
    });

    Handlebars.registerHelper('gameActors', function (item) {
      let tmp = game.actors.filter(a => a.isOwner)
      console.log(item)
      let fin = tmp;
      for (let i = 0; i < tmp.length; i++){
        console.log(tmp[i])
        if (tmp[i].type == "servant"){
          fin.splice(i,1)
        }
      }
      return fin;
    });

    Handlebars.registerHelper('ifIn', function(arg1, arg2, options) {
      return (arg1[arg2]) ? options.fn(this) : options.inverse(this);
    });

    Handlebars.registerHelper('skill', function(arg) {
      let str = arg;
      if (str != null){
        if (str.indexOf(':') != -1){
          let i = str.indexOf(":");
          let title = str.substring(0,i)
          let name = str.substring(i+1)
          title = (title.indexOf("DX3rd.") != -1) ? game.i18n.localize(title) : title
          name = (name.indexOf("DX3rd.") != -1) ? game.i18n.localize(name) : name
          str = title + ": " + name
        } else {
          str = (str.indexOf("DX3rd.") != -1) ? game.i18n.localize(str) : str
        }
      }
      return str;
    });

    Handlebars.registerHelper('skillByKey', function(actor, key) {
      if (key == "-" || actor == null)
        return key;

      if (!(key in actor.system.attributes.skills)){
        for (let [key2,val] of Object.entries(actor.system.attributes.skills)){
          if (val.category && key in val.subskills){
            return "<" + game.i18n.localize(val.name) + ": " + key[0].toUpperCase() + key.slice(1) + ">";
          }
        }
        return "<" + game.i18n.localize("DX3rd." + key[0].toUpperCase() + key.slice(1)) + ">";
      }

      let name = actor.system.attributes.skills[key].name;
      return (name.indexOf('DX3rd.') != -1) ? "<" + game.i18n.localize(name) + ">" : "<" + name + ">";
    });

    Handlebars.registerHelper('checkRollFormula', function(item) {
      if ((item.system.attributes == {}) && (item.system.effect.attributes == {})){
        return false;
      } else {
        for (const [key, attr] of Object.entries(item.system.attributes)){
          if (attr.rollformula){
            return true;
          }
        }
        for (const [key, attr] of Object.entries(item.system.effect.attributes)){
          if (attr.rollformula){
            return true;
          }
        }
        return false;
      }
    });

    Handlebars.registerHelper('timing', function(arg) {
      if (arg == "" || arg == "-") return;

      let split = arg.split("-");
      let retList = [];

      for (let s of split) {
        let ss = s[0].toUpperCase() + s.slice(1);
        retList.push(game.i18n.localize(`DX3rd.${ss}`));
      }

      return retList.join(" / ");
    });

    Handlebars.registerHelper('attrSkill', function(actor, item, key, idx) {
      if (key == '-')
        return;

      if (actor != null && key in actor)
        return Handlebars.compile('{{skill arg}}')({arg: actor[key][idx]});

      if (key in item)
        return Handlebars.compile('{{skill arg}}')({arg: item[key][idx]});
    });

    Handlebars.registerHelper('effectById', function(actor, id) {
      if (actor == null)
        return;

      console.log(actor.items.get(id));
      if (id in actor.items)
        return actor.items.get(id);
    });

    Handlebars.registerHelper('getActorEffects', function(item) {
      let actor = item.actor;
      let list = []
      if (actor){
        actor.items.forEach(e =>{
          if (e.type == "effect"){
            list.push(e)
          }
        })
      }
      return list;
    });

    Handlebars.registerHelper('checkDisabledItems', function(item) {
      console.log(item)
      return false;
    });


    Handlebars.registerHelper('disable', function(arg) {
      const list = {"notCheck": "DX3rd.NotCheck", "roll": "DX3rd.AfterRoll", "major": "DX3rd.AfterMajor", "reaction": "DX3rd.AfterReaction", "round": "DX3rd.AfterRound", "battle": "DX3rd.AfterScene", "turn": "DX3rd.AfterTurn", "use": "DX3rd.AfterUse", "session": "DX3rd.AfterSession", "guard": "DX3rd.AfterGuard", "onsetup": "DX3rd.OnSetup", "oncleanup": "DX3rd.OnCleanup"};
      return game.i18n.localize(list[arg]);
    });

    Handlebars.registerHelper('encroach', function(arg) {
      if (arg <= 100)
        return `background: linear-gradient(90deg, black ${arg}%, lightslategray 0%);`;
      else if (arg <= 200)
        return `background: linear-gradient(90deg, #7e0018 ${arg - 100}%, black 0%);`;
      else
        return `background: linear-gradient(90deg, darkcyan ${arg - 200}%, #7e0018 0%);`;
    });

  }
}
