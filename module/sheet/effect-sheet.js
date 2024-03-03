import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdEffectSheet extends DX3rdAttributesSheet {

  /** @override */
  _getSubmitData(updateData) {
    let formData = super._getSubmitData(updateData);
    formData = this.updateFreeForms(formData, "effect", "attributes", true, true);
    formData = this.updateFreeForms(formData, "effect", "statuses", true, true);
    formData = this.updateFreeForms(formData, "createItem", "weapons", false, false);
    formData = this.updateFreeForms(formData, "createItem", "armor"), false, false;
    formData = this.updateFreeForms(formData, "createItem", "vehicles", false, false);
    formData = this.updateFreeForms(formData, "createItem", "items", false, false);
    formData = this.updateFreeForms(formData, "flags", "effects", false, false);
    formData = this.updateFreeForms(formData, "flags", "items", false, false)
    formData = this.updateFreeForms(formData, "flags", "owned", false, false)
    console.log(this)
    return formData;
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);
    html.find(".attributes-t").on("click", "a.attribute-control", this._onClickControl.bind(this, "system.effect.attributes", ".attribute", false));
    html.find(".statuses").on("click", "a.status-control", this._onClickControl.bind(this, 'system.effect.statuses', ".status", false));
    html.find(".weapon").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".armor").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".vehicles").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".consumables").on("click", "a.equipment-control", this._onClickControl.bind(this, "system.createItem.", ".equip", true));
    html.find(".flags").on("click", "a.flags-control", this._onClickControl.bind(this, 'system.flags.', ".flag", true));

  }

}