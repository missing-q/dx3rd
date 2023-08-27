await new FilePicker({
    displayMode: 'tiles',
    callback: picked
}).render()

async function picked(file) {
    const icons = {
    "Angel Halo": "icons/svg/angel.svg",
    "Balor" : "icons/svg/eye.svg",
    "Black Dog": "icons/svg/lightning.svg",
    "Bram Stoker": "icons/svg/blood.svg",
    "Chimaera": "icons/svg/pawprint.svg",
    "Common": "icons/svg/aura.svg",
    "Exile": "icons/svg/bones.svg",
    "Hanuman": "icons/svg/sound.svg",
    "Morpheus": "icons/svg/explosion.svg",
    "Neumann": "icons/svg/light.svg",
    "Orcus": "icons/svg/mountain.svg",
    "Ouroboros": "icons/svg/acid.svg",
    "Salamandra": "icons/svg/sun.svg",
    "Solaris": "icons/svg/pill.svg",
    "Renegade": "icons/svg/daze.svg"
    }
    var request = new XMLHttpRequest();
    request.open("GET", `${file}`, false);
    request.send(null)
    var obj = JSON.parse(request.responseText);
    for (const syndrome in obj){
        let abilitylist = obj[syndrome];
        let folder = await Folder.create({
            name: syndrome,
            type: "Item"
        });

        for (var i = 0; i < abilitylist.length; i++){
            let tmp = abilitylist[i];
            let newItem = {
                "name": tmp.name,
                "type": "effect",
                "folder": folder.id,
                "img": icons[tmp.syndrome],
                "system": {
                    "difficulty": tmp.difficulty,
                    "timing": tmp.timing.toLowerCase(),
                    "limit": tmp.restrict,
                    "skill": tmp.skill.toLowerCase(),
                    "target": tmp.target,
                    "range": tmp.range,
                    "description": tmp.description,
                    "syndrome": tmp.syndrome,
                    "level":{
                        "max": tmp.max_lv
                    },
                    "encroach": {
                        "value": tmp.encroach
                    },
                    "uses":{}
                }
            }
            if (tmp.skill == "R.C"){
                newItem.system.skill = "rc"
            }
            if (tmp.timing == "Major/Reaction"){
                newItem.system.timing = "major-reaction"
            }
            //uses formula parser
            if ((tmp.uses != "-") && (tmp.uses != "Refer") ){
                let uses = tmp.uses.split("/")
                let num = uses[0];
                let freq = uses[1].toLowerCase();
                if (freq == "scenario"){
                    freq = "session"
                }
                if (freq == "scene"){
                    freq = "battle"
                }
                if (num.indexOf('[LV]') != -1){
                    num = num.replace("[LV]", "@level");
                }
                newItem.system.uses.formula_max = num;
                newItem.system.uses.formula_timing = freq;
                newItem.system.uses.active = true
            }
            newItem.system.restrict = tmp.restrict
            

            Item.create(newItem)
        }
        console.log("Items done importing! :D")
    }
    
}