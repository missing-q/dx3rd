import { DX3rdAttributesSheet } from "./attributes-sheet.js";

export class DX3rdComboSheet extends DX3rdAttributesSheet {

  /** @override */
  async getData(options) {
    let data = await super.getData(options);

    this.actorSkills = data.system.actorSkills

  	data.actorEffect = {};
    data.actorWeapon = {};

    if (this.actor != null) {
      data.actor = this.actor;
    	let items = this.actor.items;

	    for (let i of items) {
      	let item = i;

      	if (item.type == 'weapon' || item.type == 'vehicle')
      		data.actorWeapon[i.id] = i.name;
      	else if (item.type == 'effect')
      		data.actorEffect[i.id] = i.name;
    	}
    }

    return data;
  }

  /** @inheritdoc */
  activateListeners(html) {
    super.activateListeners(html);

    html.find(".change-skill").change(this._onSkillChange.bind(this));

    html.find(".add-effect").click(this._onEffectCreate.bind(this));
    html.find(".add-weapon").click(this._onWeaponCreate.bind(this));

    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));
    html.find('.item-label').click(this._onShowItemDetails.bind(this));
  }

  /* -------------------------------------------- */

  async _onSkillChange(event) {
    const skillId = $(event.currentTarget).val();
    let base = "-";
    if (this.actor != null && "base" in this.actorSkills[skillId]) 
      base = this.actorSkills[skillId].base;
    else if ("base" in game.DX3rd.baseSkills[skillId])
      base = game.DX3rd.baseSkills[skillId].base;
    $("#base").val(base);

    await this._onSubmit(event);
  }


  /* -------------------------------------------- */

  async _onEffectCreate(event) {
    let key = this.item.system.effectTmp;
    if (this.item.system.effect.includes(key))
      return;

    let newKey = document.createElement("div");
    const effect = `<input type="hidden" name="system.effect" value="${key}"/>`;
    newKey.innerHTML = effect;

    newKey = newKey.children[0];
    this.form.appendChild(newKey);
    //console.log(key)
    //console.log(this._onSubmit)
    await this._onSubmit(event);
  }

  /* -------------------------------------------- */

  async _onWeaponCreate(event) {
    let key = this.item.system.weaponTmp;
    if (this.item.system.weapon.includes(key))
      return;

    let newKey = document.createElement("div");
    const weapon = `<input type="hidden" name="system.weapon" value="${key}"/>`;
    newKey.innerHTML = weapon;

    newKey = newKey.children[0];
    this.form.appendChild(newKey);
    await this._onSubmit(event);
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.items.get(li.dataset.itemId);

    item.sheet.render(true);
  }

  /* -------------------------------------------- */

  /**
   * Handle deleting an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemDelete(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    li.remove();
    await this._onSubmit(event);
  }

  /* -------------------------------------------- */

  _onShowItemDetails(event) {
    event.preventDefault();
    const item = $(event.currentTarget.closest('.item'));
    const description = item.find('.item-description');

    item.toggleClass('open');
    description.slideToggle();
  }

  /* -------------------------------------------- */

}