const timerModeUp = 0;
const timerModeDown = 1;
const msecsInSecond = 1000;
const settingsVersion = 1;

let currentTimer = null;
let synth = window.speechSynthesis;
let synthVoices = synth.getVoices();
let nosleep = new NoSleep();

function log(t) {
    el('debugConsole').innerText = t + '\n' + el('debugConsole').innerText;
}

function el(id) {
    return document.getElementById(id);
}

function initDefaults() {
    el('repetitions').value = '10';
    el('delay').value = 1;
    el('preDelay').value = 0;
}

function getNewTimer() {
    return {
        repetitions: parseInt(el('repetitions').value),
        delay: parseInt(el('delay').value) * msecsInSecond,
        mode: el('mode').selectedIndex === 0 ? timerModeUp : timerModeDown,
        preDelay: parseInt(el('preDelay').value) * msecsInSecond,
        voice: synthVoices[el('voices').selectedIndex],
        stop: false,
        count: 0
    };
}

function getRepetition(timerState) {
    let ret;

    if (timerState.mode == timerModeDown)
        ret = timerState.repetitions - timerState.count;
    else
        ret = timerState.count + 1;

    return ret;
}

function say(text, voice) {
    let utter = new SpeechSynthesisUtterance('' + text);
    utter.volume = 1;
    utter.voice = voice;
    synth.cancel();
    synth.speak(utter);
}

function timerTick(timerState) {
    if (timerState.stop)
        return;

    let repetition = getRepetition(timerState);
    log(repetition);
    say(repetition, timerState.voice);

    timerState.count++;

    if (timerState.count < timerState.repetitions)
        setTimeout(timerTick, timerState.delay, timerState);
    else
        currentTimer = null;

    updateUi();
}

function updateUi() {
    let timerIsRunning = currentTimer != null;
    el('start').disabled = timerIsRunning;
    el('startPreset').disabled = el('start').disabled;
    el('stop').disabled = !timerIsRunning;
    if (!timerIsRunning && nosleep.isEnabled) {
        nosleep.disable();
    }
    let presets = JSON.parse(window.localStorage.getItem('presets') || "{}");
    el('presetOptions').innerHTML='';
    for (let preset in presets) {
        if (!presets.hasOwnProperty(preset)) {
            continue;
        }
        let new_option = document.createElement('option');
        new_option.value = preset;
        el('presetOptions').appendChild(new_option);
    }
}

function startTalkingTimer() {
    if (currentTimer)
        return;
    saveSettings();
    currentTimer = getNewTimer();
    setTimeout(timerTick, currentTimer.preDelay, currentTimer);
    nosleep.enable();
    updateUi();
}

function stopTalkingTimer() {
    if (!currentTimer)
        return;
    currentTimer.stop = true;
    currentTimer = null;
    updateUi();
}

function populateVoices() {
    for (let i = 0; i < synthVoices.length; i++) {
        let e = document.createElement("option");
        e.textContent = synthVoices[i].name + ' [' + synthVoices[i].lang + ']';
        el('voices').appendChild(e);
        if (synthVoices[i].default)
            el('voices').selectedIndex = i;
    }
}

function getSettings() {
    return {
        version: settingsVersion,
        repetitions: parseInt(el('repetitions').value),
        delay: parseInt(el('delay').value),
        mode: el('mode').selectedIndex,
        preDelay: parseInt(el('preDelay').value),
        /* voice is stored and looked up as a string and not basing on index as
           browser can add support to some language breaking the order */
        voice: el('voices').value
    }
}

function saveSettings() {
    window.localStorage.setItem('settings', JSON.stringify(getSettings()));
}

function applySettings(settings) {
    if (!settings || settings.version != settingsVersion)
        return;
    el('repetitions').value = settings.repetitions;
    el('delay').value = settings.delay;
    el('mode').selectedIndex = settings.mode;
    el('preDelay').value = settings.preDelay;

    let voiceOptions = el('voices').options;
    for (let i = 0; i < voiceOptions.length; i++)
        if (voiceOptions.item(i).value === settings.voice)
            el('voices').selectedIndex = i;
}

function loadSettings() {
    return applySettings(JSON.parse(window.localStorage.getItem('settings')))
}

function savePresetPressed() {
    let presets = JSON.parse(window.localStorage.getItem('presets') || "{}");
    presets[el('presetInput').value] = getSettings();
    window.localStorage.setItem('presets', JSON.stringify(presets));
    updateUi();
}

function startPresetPressed() {
    let presets = JSON.parse(window.localStorage.getItem('presets') || "{}");
    const selected_preset = el('presetInput').value;
    if (presets.hasOwnProperty(selected_preset)) {
        applySettings(presets[selected_preset])
    }
    startTalkingTimer();
}

function deletePresetPressed() {
    let presets = JSON.parse(window.localStorage.getItem('presets') || "{}");
    delete presets[el('presetInput').value];
    window.localStorage.setItem('presets', JSON.stringify(presets));
    updateUi();
}

window.onload = () => {
    populateVoices();
    initDefaults();
    loadSettings();
    el('start').onclick = startTalkingTimer;
    el('stop').onclick = stopTalkingTimer;
    el('savePreset').onclick = savePresetPressed;
    el('startPreset').onclick = startPresetPressed;
    el('deletePreset').onclick = deletePresetPressed;
    updateUi();
};