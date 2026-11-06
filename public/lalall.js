(function() {
            
            const heroImg = document.getElementById('parallaxHeroImg');
            const heroContainer = document.getElementById('heroParallaxContainer');
            
            if (heroImg && heroContainer) {
                window.addEventListener('scroll', function() {
                    const scrollPosition = window.pageYOffset;
                    const containerTop = heroContainer.offsetTop;
                    const containerHeight = heroContainer.offsetHeight;
                    
                   
                    if (scrollPosition < containerTop + containerHeight && scrollPosition + window.innerHeight > containerTop) {
                      
                        const translateY = scrollPosition * 0.35;
                        heroImg.style.transform = `translateY(${translateY}px)`;
                    } else {
                      
                        if (scrollPosition >= containerTop + containerHeight) {
                            heroImg.style.transform = `translateY(${containerHeight * 0.35}px)`;
                        }
                    }
                });
            }

            
            const circles = document.querySelectorAll('.deco-circle');
            const diamonds = document.querySelectorAll('.deco-diamond');
            
            if (circles.length || diamonds.length) {
                window.addEventListener('scroll', function() {
                    const scrolled = window.pageYOffset;
                    
                    
                    circles.forEach((circle, idx) => {
                       
                        const speeds = [0.18, 0.28, 0.22];
                        const speed = speeds[idx % speeds.length];
                        const yOffset = scrolled * speed;
                        circle.style.transform = `translateY(${yOffset}px)`;
                    });
                    
                    
                    diamonds.forEach((diamond, idx) => {
                        const speedsDiamond = [0.32, 0.42, 0.25];
                        const speed = speedsDiamond[idx % speedsDiamond.length];
                        const yOffset = scrolled * speed;
                        
                        diamond.style.transform = `rotate(45deg) translateY(${yOffset}px)`;
                    });
                });
            }
        })();