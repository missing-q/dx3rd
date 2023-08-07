import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdEffectSheet extends DX3rdAttributesSheet {

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateEffectAttributes(formData);
    return formData;
  }

  updateEffectAttributes(formData) {
    // Handle the free-form attributes list
    const formAttrs = expandObject(formData).system.effect.attributes || {};

    const attributes = Object.values(formAttrs).reduce((obj, v) => {
      let k = v["key"].trim();
      if ( /[\s\.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
      delete v["key"];

      try {
        if (k != "-") {
          let num = v.value.replace("@level", 0);
          if (v.rollvalue != undefined ){
            num = num.replace("@roll", v.rollvalue)
          } else {
            num = num.replace("@roll", 0)
          }
          num = num.replace("@maxhp", 0)
          num = num.replace("@currhp", 0)
          math.evaluate(num);
        }
      } catch (error) {
        ui.notifications.error(v.value + ": Values other than formula, @roll, @level are not allowed.");
      }

      obj[k] = v;
      return obj;
    }, {});

    // Remove attributes which are no longer used
    if (this.object.system.effect.attributes != null)
    for ( let k of Object.keys(this.object.system.effect.attributes) ) {
      if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    }

    // Re-combine formData
    formData = Object.entries(formData).filter(e => !e[0].startsWith("system.effect.attributes")).reduce((obj, e) => {
      obj[e[0]] = e[1];
      return obj;
    }, {id: this.object.id, "system.effect.attributes": attributes});

    return formData;
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.replenish-uses').on('click', async ev => {
      ev.preventDefault();

      const itemId = ev.currentTarget.offsetParent.id.slice(-16)
      const item = this.actor.items.get(itemId);
      //console.log(item)
      let max = item.system.uses.max
      await item.update({'system.uses.current': max});
      await item.update({'system.disabled':false});
    });

  }
}