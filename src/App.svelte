<script>
  import { onMount } from "svelte";
  import Timeline from "./Timeline.svelte";
  export let name;
  const handleKeyDown = e => {
    let key = e.key;
    console.log(key);
  };
  onMount(async () => {

    function onMIDISuccess(midiAccess) {
      for (var input of midiAccess.inputs.values())
        input.onmidimessage = getMIDIMessage;
    }

    function getMIDIMessage(midiMessage) {
      console.log(midiMessage);
		}
		try{
		const midiAccess = await navigator.requestMIDIAccess();
		onMIDISuccess(midiAccess)

		}catch(e){
			console.error(e)
		}

  });
</script>

<style>
  :global(body) {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    padding: 0;
    margin: 0;
  }
	main{
		display: grid;
		grid-template-rows: repeat(auto-fit, minmax(100px,1fr) );
    height:100%;
    width:100%;
	}
</style>

<svelte:window on:keydown={handleKeyDown} />

<main>
  <Timeline measures={24} freq={880} />
  <Timeline measures={24} freq={742.5} />
  <Timeline measures={24} freq={660} />
  <Timeline measures={24} freq={556.875} />
  <Timeline measures={24} freq={495} />
  <Timeline measures={24} freq={440} />
</main>
