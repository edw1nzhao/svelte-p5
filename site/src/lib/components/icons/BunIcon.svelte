<script lang="ts">
	let { class: cls = 'size-4' }: { class?: string } = $props();
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 80 70"
	class={cls}
	aria-hidden="true"
	focusable="false"
>
	<title>Bun</title>
	<ellipse cx="40" cy="36" rx="36" ry="30" fill="#fbf0df" />
	<ellipse cx="40" cy="36" rx="36" ry="30" fill="none" stroke="#1a1a1a" stroke-width="3" />
	<circle cx="28" cy="33" r="3" fill="#1a1a1a" />
	<circle cx="52" cy="33" r="3" fill="#1a1a1a" />
	<path
		d="M33 44c1.8 4 4 6 7 6s5.2-2 7-6c.4-.9-.2-1.7-1.1-1.5-2 .5-3.9.8-5.9.8s-3.9-.3-5.9-.8c-.9-.2-1.5.6-1.1 1.5Z"
		fill="#f4a4a0"
		stroke="#1a1a1a"
		stroke-width="1.4"
		stroke-linejoin="round"
	/>
	<ellipse cx="20" cy="46" rx="5" ry="3" fill="#febbd0" opacity="0.85" />
	<ellipse cx="60" cy="46" rx="5" ry="3" fill="#febbd0" opacity="0.85" />
</svg>
