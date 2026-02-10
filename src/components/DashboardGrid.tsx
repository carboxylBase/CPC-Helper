import PlatformCard from './PlatformCard';

interface DashboardGridProps {
  cardStyle: any;
}

const DashboardGrid = ({ cardStyle }: DashboardGridProps) => {
  return (
    <div className="animate-fade-in pb-20">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* 1. Codeforces (Enabled) */}
        <PlatformCard 
          platformName="Codeforces" 
          platformKey="codeforces"
          cardStyle={cardStyle}
          isEnabled={true} 
        />

        {/* 2. LeetCode (Placeholder) */}
        <PlatformCard 
          platformName="LeetCode" 
          platformKey="leetcode"
          cardStyle={cardStyle}
          isEnabled={false} 
        />

        {/* 3. AtCoder (Enabled) */}
        <PlatformCard 
          platformName="AtCoder" 
          platformKey="atcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
        />

          {/* 4. NowCoder (Enabled) */}
          <PlatformCard 
          platformName="NowCoder" 
          platformKey="nowcoder"
          cardStyle={cardStyle}
          isEnabled={true} 
        />
          
          {/* 5. HDU (Placeholder) */}
          <PlatformCard 
          platformName="HDU" 
          platformKey="hdu"
          cardStyle={cardStyle}
          isEnabled={false} 
        />
      </div>
    </div>
  );
};

export default DashboardGrid;