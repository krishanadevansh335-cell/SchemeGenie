import { InteractiveRobotSpline } from './ui/interactive-3d-robot';

/**
 * Demo page showcasing the Interactive 3D Robot
 */
export function Interactive3DRobotDemo() { 
  
  const ROBOT_SCENE_URL = "https://prod.spline.design/PyzDhpQ9E5f1E3MT/scene.splinecode";

  return (
    <div className="relative w-screen h-screen overflow-hidden">

      {/* 3D Robot Background */}
      <InteractiveRobotSpline
        scene={ROBOT_SCENE_URL}
        className="absolute inset-0 z-0" 
      />

      {/* Overlay Content */}
      <div className="
        absolute inset-0 z-10
        pt-20 md:pt-32 lg:pt-40
        px-4 md:px-8            
        pointer-events-none     
      ">
       
        <div className="
          text-center
          text-white
          drop-shadow-lg
          w-full max-w-2xl
          mx-auto
        ">
         
          <h1 className="
            text-2xl md:text-3xl lg:text-4xl xl:text-5xl 
            font-bold 
            mb-4
          ">
            This is interactive 3D robot Whobee
          </h1>

          <p className="
            text-base md:text-lg lg:text-xl
            text-gray-200
            mb-8
          ">
            Interact with the robot by clicking and dragging
          </p>

          {/* Interactive Button Example */}
          <button className="
            pointer-events-auto
            px-6 py-3
            bg-blue-600 hover:bg-blue-700
            text-white
            rounded-lg
            font-semibold
            transition-all
            shadow-lg hover:shadow-xl
            transform hover:scale-105
          ">
            Get Started
          </button>
        </div>
      </div>

    </div> 
  );
}

export default Interactive3DRobotDemo;
