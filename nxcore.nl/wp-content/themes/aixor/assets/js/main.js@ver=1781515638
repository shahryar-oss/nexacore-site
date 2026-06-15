(function($) {
    "use strict";

    document.addEventListener('DOMContentLoaded', function () {

        // Initialize AOS (Animate on Scroll) on Elementor
            $(window).on('elementor/frontend/init', function() {
                elementorFrontend.hooks.addAction('frontend/element_ready/global', function() {
                    AOS.init({
                        duration: 600,
                        offset: 70
                    });
                });
            });

            /* Loader */
            window.addEventListener('load', function () {
                const preloader = $('.preloader-wrap');
                if (preloader.length) {
                    preloader.fadeOut(1000); // Fade out over 1 second
                }
            });

            let body = document.querySelector('body');


            /* Custom Cursor */
            const cursorBall = document.getElementById('ball');
            document.addEventListener('mousemove', function (e) {
                if (cursorBall) {
                    gsap.to(cursorBall, {
                        duration: 1,
                        x: e.clientX,
                        y: e.clientY,
                        opacity: 1,
                        ease: 'power2.out'
                    });
                }
            });
            const hoverElements = document.querySelectorAll('a');
            const hoverElements2 = document.querySelectorAll('.feature-project');
            hoverElements2.forEach(function (element) {
                element.addEventListener('mouseenter', function () {
                    if (cursorBall) {
                        cursorBall.style.opacity = 0;
                        cursorBall.classList.add('hide-mouse');
                    }
                });
                element.addEventListener('mouseleave', function () {
                    if (cursorBall) {
                        cursorBall.style.opacity = 1;
                        cursorBall.classList.remove('hide-mouse');
                    }
                });
            })
            hoverElements.forEach(function (element) {
                element.addEventListener('mouseenter', function () {
                    if (cursorBall) {
                        cursorBall.classList.add('hovered');
                        gsap.to(cursorBall, {
                            duration: 0.3,
                            scale: 1, // 2
                            opacity: 0,
                            ease: 0.1
                        });
                    }
                });
                element.addEventListener('mouseleave', function () {
                    if (cursorBall) {
                        cursorBall.classList.remove('hovered');
                        gsap.to(cursorBall, {
                            duration: 0.3,
                            scale: 1,
                            opacity: 1,
                            ease: 'power2.out'
                        });
                    }
                });
            });
		
		// Contact Form Budget Slider

            if ($('#budget-value').length) {
                const value = document.querySelector("#budget-value");
                const input = document.querySelector("#pi_input");
                const budgetInput = document.querySelector('input[name="budget"]'); // Added this line
            
                value.textContent = input.value;
                budgetInput.value = input.value; // Store the budget value in the hidden input field
            
                input.addEventListener("input", (event) => {
                    value.textContent = event.target.value;
                    budgetInput.value = event.target.value; // Update the hidden input field when the user changes the budget
                });
            }

            // Sidebar Menu
            const hamburgMenu = document.querySelector('.hamburg-menu');
            const closeHeaderSidebar = document.querySelector('.header-sidebar-wrap .header-sidebar-content .close-header-sidebar');
            const headerSidebar = document.querySelector('.header-sidebar-wrap');
            const headerSidebarMenu = document.querySelectorAll('.header-sidebar-wrap .header-sidebar-content .sidebar-menu ul li');

            if (hamburgMenu) {
                hamburgMenu.addEventListener('click', function (e) {
                    e.preventDefault();
                    headerSidebar.classList.add('active');
                });
                closeHeaderSidebar.addEventListener('click', function (e) {
                    e.preventDefault();
                    headerSidebar.classList.remove('active');
                });
                if (headerSidebarMenu) {
					headerSidebarMenu.forEach(menu => {
						const menuList = menu.querySelector('a');
						
						menuList.addEventListener('click', function () {
							headerSidebar.classList.remove('active');
						});
					})
                }

                window.addEventListener('scroll', function () {
                    let scrollAmount = window.scrollY;
                    if (scrollAmount >= 100) {
                        hamburgMenu.classList.add('active');
                    } else {
                        hamburgMenu.classList.remove('active');
                    }
                });
            }

            if (document.querySelectorAll('.notch-bar-menu-wrap')) {
                document.addEventListener("scroll", onScroll);

                // smooth scroll
                document.querySelectorAll('.notch-bar-menu-wrap a[href^="#"]').forEach(function(anchor) {
                    anchor.addEventListener('click', function (e) {
                        e.preventDefault();
                        document.removeEventListener("scroll", onScroll);

                        document.querySelectorAll('a').forEach(function (link) {
                            link.classList.remove('active');
                        });
                        this.classList.add('active');

                        var target = this.hash;
                        var $target = document.querySelector(target);
                        window.scrollTo({
                            top: $target.offsetTop,
                            behavior: 'smooth'
                        });

                        window.setTimeout(function() {
                            window.location.hash = target;
                            document.addEventListener("scroll", onScroll);
                        }, 500);
                    });
                });
            }

            function onScroll(event) {
                var scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
                document.querySelectorAll('.notch-bar-menu-wrap a').forEach(function(currLink) {
                    var refElement = document.querySelector(currLink.getAttribute("href"));
                    if (refElement) {
                        if (refElement.offsetTop <= scrollPos && refElement.offsetTop + refElement.offsetHeight > scrollPos) {
                            document.querySelectorAll('.notch-bar-menu-wrap ul li a').forEach(function (link) {
                                link.classList.remove("active");
                            });
                            currLink.classList.add("active");
                        } else {
                            currLink.classList.remove("active");
                        }
                    }
                });
            }

            const tabs = document.querySelectorAll(".pricing_nav .nav-link");
            const indicator = document.querySelector(".pricing_nav_wrap .nav-hover-shape");

            function updateIndicatorPosition(element) {
                const offsetLeft = element.offsetLeft;
                const width = element.offsetWidth;
                indicator.style.left = `${offsetLeft}px`;
                indicator.style.opacity = 1;
                // indicator.style.width = `${width}px`;
            }

            tabs.forEach(tab => {
                tab.addEventListener("click", function() {
                    tabs.forEach(t => t.classList.remove("active"));
                    this.classList.add("active");
                    updateIndicatorPosition(this);
                });
            });

            // Initialize the indicator position
            const activeTab = document.querySelector(".nav-link.active");
            if (activeTab) {
                updateIndicatorPosition(activeTab);
            }


            if (document.querySelectorAll('.feature-project')) {
                document.querySelectorAll('.feature-project').forEach(box => {
                    const hoverElement = box.querySelector('.hover_mouse');

                    box.addEventListener('mousemove', (event) => {
                        const boxRect = box.getBoundingClientRect();
                        const mouseX = event.clientX - boxRect.left;
                        const mouseY = event.clientY - boxRect.top;

                        if (hoverElement) {
                            hoverElement.style.transform = `translate3d(${mouseX - 50}px, ${mouseY - 50}px, 0)`;
                            hoverElement.classList.add('active');
                        }
                    });

                    if (hoverElement) {
                        box.addEventListener('mouseleave', () => {
                            // hoverElement.style.transform = `translate3d(0, 0, 0)`;
                            hoverElement.classList.remove('active');
                        });
                    }
                });
            }
            if (document.querySelector('.testimonial-lists-wrap')) {
                const hoverElement3 = document.querySelector('.testimonial-lists-wrap .hover_mouse');
                document.querySelector('.testimonial-lists-wrap').addEventListener('mousemove', (event) => {
                    const boxRect = document.querySelector('.testimonial-lists-wrap').getBoundingClientRect();
                    const mouseX = event.clientX - boxRect.left;
                    const mouseY = event.clientY - boxRect.top;

                    if (hoverElement3) {
                        hoverElement3.style.transform = `translate3d(${mouseX - 50}px, ${mouseY - 50}px, 0)`;
                        hoverElement3.classList.add('active');
                    }
                });

                if (hoverElement3) {
                    document.querySelector('.testimonial-lists-wrap').addEventListener('mouseleave', (testimonial) => {
                        hoverElement3.classList.remove('active');
                    });
                }
				
				document.querySelector('.testimonial-lists-wrap').addEventListener('mouseenter', function () {
                    if (cursorBall) {
                        cursorBall.style.opacity = 0;
                        cursorBall.classList.add('hide-mouse');
                    }
                });
                document.querySelector('.testimonial-lists-wrap').addEventListener('mouseleave', function () {
                    if (cursorBall) {
                        cursorBall.style.opacity = 1;
                        cursorBall.classList.remove('hide-mouse');
                    }
                });
            }


            /* Gsap */
            gsap.registerPlugin(ScrollTrigger);
            const splitTypes = document.querySelectorAll('.reveal-type');
            if (splitTypes) {
                splitTypes.forEach((char, i) => {
                    const text = new SplitType(char, {types: 'chars, words'});

                    gsap.from(text.chars, {
                        scrollTrigger: {
                            opacity: 1, // Initial state
                            trigger: char,
                            start: 'top 80%',
                            end: 'top -10%',
                            scrub: true,
                            marker: false
                        },
                        opacity: 0.2,
                        stagger: 0.5
                    })
                });
            }


            const allDivs = document.querySelectorAll('.aixor-main > div');
            allDivs.forEach(div => {
                gsap.fromTo(
                    ".scaleDown", // Target element
                    { scale: 2 }, // From: Start scale (1 means normal size)
                    {
                        scale: 1, // To: End scale (2 means zoomed in)
                        ease: "none", // Animation ease (change as needed)
                        scrollTrigger: {
                            trigger: div, // Trigger element
                            // start: "top top", // Trigger animation at the top of .full-image-sec
                            // end: "bottom top", // End animation at the top of .full-image-sec
                            scrub: true, // Smooth scrubbing effect
                            markers: false // Show ScrollTrigger markers (for debugging)
                        },
                        start: "top top", // Trigger at the top of .full-image-sec
                        end: "bottom top", // End trigger at the top of .full-image-sec
                    }
                );
            });
			
			

            const allDivs2 = document.querySelectorAll('body div');
            allDivs2.forEach(div => {
                gsap.fromTo(
                    ".scaleDown", // Target element
                    { scale: 1.5 }, // From: Start scale (1 means normal size)
                    {
                        scale: 1, // To: End scale (2 means zoomed in)
                        ease: "none", // Animation ease (change as needed)
                        scrollTrigger: {
                            trigger: div, // Trigger element
                            // start: "top top", // Trigger animation at the top of .full-image-sec
                            // end: "bottom top", // End animation at the top of .full-image-sec
                            scrub: true, // Smooth scrubbing effect
                            markers: false // Show ScrollTrigger markers (for debugging)
                        },
                        start: "top top", // Trigger at the top of .full-image-sec
                        end: "bottom top", // End trigger at the top of .full-image-sec
                    }
                );
            });
        });
    // });
	
	document.addEventListener("DOMContentLoaded", function() {
        // Set the first link as active when the page loads
        var scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
        document.querySelectorAll('.notch-bar-menu-wrap a').forEach(function(currLink) {
            var refElement = document.querySelector(currLink.getAttribute("href"));
            if (refElement && refElement.offsetTop <= scrollPos && refElement.offsetTop + refElement.offsetHeight > scrollPos) {
                currLink.classList.add("active");
            }
        });
    });

    window.addEventListener("scroll", function(event) {
        var scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
        document.querySelectorAll('.notch-bar-menu-wrap a').forEach(function(currLink) {
            var refElement = document.querySelector(currLink.getAttribute("href"));
            if (refElement) {
                if (refElement.offsetTop <= scrollPos && refElement.offsetTop + refElement.offsetHeight > scrollPos) {
                    document.querySelectorAll('.notch-bar-menu-wrap ul li a').forEach(function(link) {
                        link.classList.remove("active");
                    });
                    currLink.classList.add("active");
                } else {
                    currLink.classList.remove("active");
                }
            }
        });
    });
	
	document.addEventListener("DOMContentLoaded", function () {
        const listItems = document.querySelectorAll(".wpcf7-list-item.first.last");

        listItems.forEach(function (listItem) {
            // Create the checkbox-marker element
            const marker = document.createElement("span");
            marker.className = "checkbox-marker";
            marker.innerHTML = '<i class="las la-check"></i>';

            // Append the marker inside the `.wpcf7-list-item.first.last` element
            listItem.appendChild(marker);
        });
    });

    document.addEventListener("DOMContentLoaded", function () {
        const listItems1 = document.querySelectorAll(".single-checkbox label");

        listItems1.forEach(function (listItem1) {
            // Create the checkbox-marker element
            const marker1 = document.createElement("span");
            marker1.className = "checkbox-marker";
            marker1.innerHTML = '<i class="las la-check"></i>';

            // Insert the marker as the second element within the label
            if (listItem1.firstChild && listItem1.children.length >= 1) {
                listItem1.insertBefore(marker1, listItem1.children[1]);
            } else {
                listItem1.appendChild(marker1);
            }
        });
    });
	
	document.addEventListener("DOMContentLoaded", function () {
        const radioButtons = document.querySelectorAll('input[name="company_type"]');

        // Function to update label styles based on selection
        function updateLabelStyles() {
            radioButtons.forEach((radio) => {
                const label = radio.closest("label");

                if (radio.checked) {
                    label.style.background = "#ffffff";
                    label.style.color = "#000000";
                } else {
                    label.style.background = "";
                    label.style.color = "";
                }
            });
        }

        // Attach event listener to each radio button
        radioButtons.forEach((radio) => {
            radio.addEventListener("change", updateLabelStyles);
        });

        // Initial call to set styles on page load
        updateLabelStyles();
    });
	
	document.addEventListener("DOMContentLoaded", function() {
        // Get the button element
        const button = document.querySelector('.contact-sec-2 .input-group button');

        // Create a new img element
        const img = document.createElement('img');
        img.src = themeData.imgUrl; // Use the localized URL
        img.alt = 'icon'; // Set the alt text

        // Append the img to the button
        button.appendChild(img);
    });
	
	document.addEventListener("DOMContentLoaded", function() {
        const testimonialLists = document.querySelector(".testimonial-lists");

        if (testimonialLists) {
            const originalBoxes = Array.from(testimonialLists.children);

            // Loop through the original set of testimonial boxes three times
            for (let i = 0; i < 3; i++) { // Repeat twice more (total of 3 times displayed)
                originalBoxes.forEach(box => {
                    const clone = box.cloneNode(true);
                    testimonialLists.appendChild(clone);
                });
            }
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
    if (window.location.hash) {
        // Wait for a brief moment to ensure page is fully loaded
        setTimeout(function () {
            var targetElement = document.querySelector(window.location.hash);
            if (targetElement) {
                // Calculate scroll position considering a potential fixed header
                var header = document.querySelector('.header-menu-wrap'); // Adjust the selector for your fixed header if different
                var headerOffset = header ? header.offsetHeight : 0;

                // Scroll to the element, considering the header offset
                var elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerOffset;
                window.scrollTo({
                    top: elementPosition,
                    behavior: 'smooth'
                });
            }
        }, 200); // Adjust timeout as needed to allow content to load
    }
});

})(jQuery);
