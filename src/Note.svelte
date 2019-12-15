<script>
  export let active = false;
  let clicked = false;
  export let freq = 27;
  let myosc = null;
  const audioContext = new AudioContext();
  const masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  masterGainNode.gain.value = .5;

  // Create the keys; skip any that are sharp or flat; for
  // our purposes we don't need them. Each octave is inserted
  // into a <div> of class "octave".

  const sineTerms = new Float32Array([0, 0, 1, 0, 1]);
  const cosineTerms = new Float32Array(sineTerms.length);
  const customWaveform = audioContext.createPeriodicWave(
    cosineTerms,
    sineTerms
  );

  function playTone(freq) {
    let osc = audioContext.createOscillator();
    osc.connect(masterGainNode);

    osc.type='triangle'
    osc.frequency.value = freq;
    osc.start();
    myosc = osc;

  }
  $: {
    if (active&&clicked) {
    playTone(freq);

  }else if(myosc){
    myosc.stop()
  }
  }

</script>

<style>
  div {
    border: 1px solid white;
    width: 100%;
    height: 100%;
  }
</style>

<div style={active ? 'background-color:#b399d4' : clicked ? 'background-color:#fac282': ''} on:click={()=>clicked = !clicked}/>
