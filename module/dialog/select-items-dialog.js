export class SelectItemsDialog extends Dialog {

  constructor(actor, callback, options) {
    super(options);

    this.actor = actor;
    this.callback = callback;

    this.data = {
      title: game.i18n.localize("DX3rd.WeaponSelect"),
      content: "",
      buttons: {
        create: {
          label: "Apply",
          callback: () => this._onSubmit()

        }
      },
      default: 'create'
    };

  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      template: "systems/dx3rd/templates/dialog/select-items-dialog.html",
      classes: ["dx3rd", "dialog"],
      width: 600
    });
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.find('.item-label').click(this._onShowItemDetails.bind(this));
    html.find(".echo-item").click(this._echoItemDescription.bind(this));
    html.find('.check-equipment').change(this._updateItemTotals.bind(this))
    
  }

  /** @override */
  getData() {
    let vehicleList = [];
    let weaponList = [];
    let itemList = [];
    let armorList = [];

    for (let i of this.actor.items) {
      if (i.type == 'weapon'){
        weaponList.push(i);
      }
      else if (i.type == 'vehicle'){
        vehicleList.push(i);
      }
      else if (i.type == 'protect'){
        armorList.push(i);
      }
      else if (i.type == 'item'){
        itemList.push(i);
      }
        
    }

    return {
      title: this.data.title,
      content: this.data.content,
      buttons: this.data.buttons,
      
      actor: this.actor,
      vehicleList: vehicleList,
      weaponList: weaponList,
      armorList: armorList,
      itemList: itemList
    }
  }

  async _onSubmit() {
    let attack = 0;
    let guard = 0;
    let list = [];

    await $(".check-equipment").each((i, val) => {
      if ($(val).is(":checked")) {
        list.push( '<h4>' + val.dataset.name + ` (${val.dataset.attack} / ${val.dataset.guard})</h4>`);

        attack += Number(val.dataset.attack);
        guard += Number(val.dataset.guard);
      }
    });

    ChatMessage.create({
      "content": `<h2><b>${game.i18n.localize("DX3rd.WeaponSelect")} (${attack} / ${guard})</b></h2>${list.join("")}`, 
      "speaker": ChatMessage.getSpeaker({actor: this.actor})
    });

    this.callback({attack, guard});
  }


  /* -------------------------------------------- */

  _onShowItemDetails(event) {
    if ($(event.target).prop("tagName") == "INPUT" || $(event.target).prop("tagName") == "IMG")
      return;

    event.preventDefault();
    const toggler = $(event.currentTarget);
    const item = toggler.parents('.item');
    const description = item.find('.item-description');

    toggler.toggleClass('open');
    description.slideToggle();
  }

  /* -------------------------------------------- */

  _echoItemDescription(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    let item = this.actor.items.get(li.dataset.itemId);

    item.toMessage();
  }

  /* -------------------------------------------- */
  _updateItemTotals(event){
    event.preventDefault();
    console.log(event)
  }


  /* -------------------------------------------- */



}