<script lang="ts">
	let { class: cls = 'size-4' }: { class?: string } = $props();
</script>

<!-- Official pnpm brand mark from Simple Icons (simpleicons.org, MIT-licensed).
     Fill is pnpm's brand color (#F69220, orange). The mark is a single path
     describing the 8-square outer arrangement plus 3 inner smaller squares —
     previous version was a hand-arranged 7-square approximation, corrected now. -->
<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 24 24"
	class={cls}
	aria-hidden="true"
	focusable="false"
>
	<title>pnpm</title>
	<path
		fill="#F69220"
		d="M0 0v7.5h7.5V0zm8.25 0v7.5h7.498V0zm8.25 0v7.5H24V0zM2 2h3.5v3.5H2zm8.25 0h3.498v3.5H10.25zm8.25 0H22v3.5h-3.5zM8.25 8.25v7.5h7.498v-7.5zm8.25 0v7.5H24v-7.5zm2 2H22v3.5h-3.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.498v-7.5zm8.25 0V24H24v-7.5z"
	/>
</svg>
