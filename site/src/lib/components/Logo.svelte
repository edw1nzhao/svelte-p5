<script lang="ts">
	let { class: cls = 'size-8' }: { class?: string } = $props();
</script>

<span class={cls} aria-hidden="true">
	<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" class="size-full">
		<defs>
			<linearGradient id="logo-g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
				<stop offset="0" stop-color="#6366f1" />
				<stop offset="1" stop-color="#a855f7" />
			</linearGradient>
		</defs>
		<rect width="64" height="64" rx="14" fill="url(#logo-g)" />
		<g
			fill="#ffffff"
			font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
			font-size="22"
			font-weight="700"
			text-anchor="middle"
		>
			<text x="32" y="28" letter-spacing="-1">sp</text>
			<text x="32" y="50" letter-spacing="-1">5</text>
		</g>
	</svg>
</span>
