<script>
  import { onMount } from "svelte";
  import Note from "./Note.svelte";
  export let measures = 12;
  export let freq = 27;
  let count = 0;
  const measureArray = Array.from({ length: measures });
  onMount(async () => {
    setInterval(() => {
      count = (count + 1) % measures;
    }, 200);
  });
</script>

<style>
  div {
    text-align: center;
    margin: 0 auto;
    background-color: #726b68;
    height:100%;
    width:100%;
    display: grid;
  }
</style>

<div style="grid-template-columns: repeat({measures}, 1fr);">
  {#each measureArray as measure, i}
    <Note active={i == count} {freq} />
  {/each}
</div>
